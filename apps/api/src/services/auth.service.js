const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const UserModel = require('../models/user.model');
const LandlordProfileModel = require('../models/landlordProfile.model');
const StudentProfileModel = require('../models/studentProfile.model');
const PasswordResetTokenModel = require('../models/passwordResetToken.model');
const pool = require('../config/database');
const AuditService = require('./audit.service');
const EmailService = require('./messaging/email.service');
const { JWT_SECRET, JWT_EXPIRES_IN } = require('../config/jwt');
const { REGISTER_ROLES } = require('@resisure/shared/constants/roles');

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

function mapDbError(err, fallback) {
  if (err && err.status) return err;
  const msg = err?.message || '';
  if (msg.includes('accepted_terms_at') || msg.includes('does not exist')) {
    return {
      status: 500,
      message: 'Database is missing a recent migration. From apps/api run: npm run migrate',
    };
  }
  if (msg.includes('ECONNREFUSED') || msg.includes('connect')) {
    return {
      status: 503,
      message: 'Cannot connect to the database. Check that PostgreSQL is running and apps/api/.env is correct.',
    };
  }
  return { status: 500, message: fallback || msg || 'Unexpected server error' };
}

const AuthService = {

  async register({ full_name, email, password, role, phone, accepted_terms }) {
    try {
      const normalizedEmail = normalizeEmail(email);

      const existing = await UserModel.findByEmail(normalizedEmail);
      if (existing) {
        throw {
          status: 409,
          message: 'An account with this email already exists. Try signing in instead.',
        };
      }

      if (!REGISTER_ROLES.includes(role)) {
        throw { status: 400, message: 'Invalid role. Must be student or landlord' };
      }

      if (!accepted_terms) {
        throw {
          status: 400,
          message: 'You must accept the Terms of Use and Privacy Policy to create an account',
        };
      }

      const password_hash = await bcrypt.hash(password, 12);

      const user = await UserModel.create({
        full_name: String(full_name).trim(),
        email: normalizedEmail,
        password_hash,
        role,
        phone: phone ? String(phone).trim() : null,
        accepted_terms_at: new Date(),
      });

      if (role === 'landlord') {
        await LandlordProfileModel.createForUser(user.id);
        user.verification_status = 'pending';
      }

      if (role === 'student') {
        await StudentProfileModel.createForUser(user.id);
        user.verification_status = 'pending';
      }

      const token = jwt.sign(
        { id: user.id, role: user.role },
        JWT_SECRET,
        { expiresIn: JWT_EXPIRES_IN }
      );

      await AuditService.log({
        actor_id: user.id,
        action: 'REGISTER',
        entity_type: 'user',
        entity_id: user.id,
        metadata: { role: user.role },
      });

      try {
        const emailResult = await EmailService.sendWelcome({
          to: user.email,
          full_name: user.full_name,
          role: user.role,
        });
        if (emailResult.skipped && process.env.NODE_ENV !== 'production') {
          console.log(`[dev] Welcome email skipped for ${user.email} — configure SMTP_HOST and SMTP_FROM in apps/api/.env`);
        }
      } catch (err) {
        console.error('Welcome email failed:', err.message);
      }

      return { user, token };
    } catch (err) {
      throw mapDbError(err, 'Registration failed');
    }
  },

  async login({ email, password }) {
    try {
      const normalizedEmail = normalizeEmail(email);
      const user = await UserModel.findByEmail(normalizedEmail);
      if (!user) {
        throw {
          status: 401,
          message: 'No account found for that email, or the password is incorrect.',
        };
      }

      const isMatch = await bcrypt.compare(password, user.password_hash);
      if (!isMatch) {
        throw {
          status: 401,
          message: 'No account found for that email, or the password is incorrect.',
        };
      }

      const token = jwt.sign(
        { id: user.id, role: user.role },
        JWT_SECRET,
        { expiresIn: JWT_EXPIRES_IN }
      );

      const { password_hash, ...safeUser } = user;
      if (safeUser.role === 'landlord') {
        safeUser.verification_status = await LandlordProfileModel.getVerificationStatus(safeUser.id) || 'pending';
      }
      if (safeUser.role === 'student') {
        safeUser.verification_status = await StudentProfileModel.getVerificationStatus(safeUser.id) || 'pending';
      }

      await AuditService.log({
        actor_id: safeUser.id,
        action: 'LOGIN',
        entity_type: 'user',
        entity_id: safeUser.id,
        metadata: { role: safeUser.role },
      });

      return { user: safeUser, token };
    } catch (err) {
      throw mapDbError(err, 'Login failed');
    }
  },

  async updateProfile(userId, { full_name, phone }) {
    const name = full_name !== undefined ? String(full_name).trim() : undefined;
    if (name !== undefined && name.length < 2) {
      throw { status: 400, message: 'Full name must be at least 2 characters' };
    }

    let normalizedPhone = phone;
    if (phone !== undefined) {
      normalizedPhone = phone === '' || phone === null ? null : String(phone).trim();
      if (normalizedPhone && !/^(\+260|0)[79]\d{8}$/.test(normalizedPhone.replace(/\s/g, ''))) {
        throw { status: 400, message: 'Enter a valid Zambian phone number' };
      }
    }

    const user = await UserModel.updateProfile(userId, {
      full_name: name,
      phone: normalizedPhone,
    });
    if (!user) throw { status: 404, message: 'User not found' };
    return user;
  },

  async uploadProfilePhoto(userId, req) {
    if (!req.file) {
      throw { status: 400, message: 'Upload a profile photo (JPG, PNG or WebP)' };
    }
    const { publicImageUrl, deleteStoredImage } = require('../config/cloudinary');
    const photoUrl = publicImageUrl(req, req.file);

    const existing = await pool.query(
      'SELECT profile_photo_url FROM users WHERE id = $1',
      [userId]
    );
    if (!existing.rows[0]) throw { status: 404, message: 'User not found' };

    const user = await UserModel.updateProfile(userId, { profile_photo_url: photoUrl });
    if (existing.rows[0].profile_photo_url) {
      await deleteStoredImage(existing.rows[0].profile_photo_url);
    }
    return user;
  },

  async requestPasswordReset(email) {
    const normalizedEmail = normalizeEmail(email);
    if (!normalizedEmail) {
      throw { status: 400, message: 'Enter the email address linked to your account' };
    }

    const user = await UserModel.findByEmail(normalizedEmail);
    const genericMessage =
      'If that email is registered, we sent password reset instructions. Check your inbox and spam folder.';

    if (!user) {
      return { message: genericMessage };
    }

    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

    await PasswordResetTokenModel.deleteUnusedForUser(user.id);
    await PasswordResetTokenModel.create({
      userId: user.id,
      tokenHash,
      expiresAt,
    });

    const resetPath = `/auth/reset-password?token=${rawToken}`;
    await EmailService.send({
      to: user.email,
      subject: 'Reset your ResiSure password',
      message:
        'We received a request to reset your password. Use the link below within one hour. If you did not request this, you can ignore this email.',
      link: resetPath,
    });

    if (!EmailService.enabled() && process.env.NODE_ENV !== 'production') {
      const base = process.env.CLIENT_URL || 'http://localhost:3000';
      console.log(`[dev] Password reset link for ${user.email}: ${base}${resetPath}`);
    }

    await AuditService.log({
      actor_id: user.id,
      action: 'PASSWORD_RESET_REQUESTED',
      entity_type: 'user',
      entity_id: user.id,
    });

    return { message: genericMessage };
  },

  async resetPassword({ token, password }) {
    if (!token || !password) {
      throw { status: 400, message: 'Reset token and new password are required' };
    }
    if (String(password).length < 8) {
      throw { status: 400, message: 'Password must be at least 8 characters' };
    }

    const tokenHash = crypto.createHash('sha256').update(String(token)).digest('hex');
    const row = await PasswordResetTokenModel.findValidByTokenHash(tokenHash);

    if (!row) {
      throw {
        status: 400,
        message: 'This reset link is invalid or has expired. Request a new password reset.',
      };
    }

    const password_hash = await bcrypt.hash(password, 12);

    await pool.query('UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2', [
      password_hash,
      row.user_id,
    ]);
    await PasswordResetTokenModel.markUsed(row.id);
    await PasswordResetTokenModel.deleteUnusedForUserAfterUse(row.user_id);

    await AuditService.log({
      actor_id: row.user_id,
      action: 'PASSWORD_RESET_COMPLETED',
      entity_type: 'user',
      entity_id: row.user_id,
    });

    return { message: 'Your password has been updated. You can sign in with your new password.' };
  },

};

module.exports = AuthService;
