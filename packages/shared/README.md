# @resisure/shared

Shared constants, validation rules, and API endpoint paths for ResiSure web, mobile, and API.

## Usage

```javascript
// API (CommonJS)
const { validateLogin } = require('@resisure/shared/validation/auth');
const { API } = require('@resisure/shared/api/endpoints');

// Web / Mobile (ESM)
import { bookingCopy } from '@resisure/shared/constants/booking';
import { getApiErrorMessage } from '@resisure/shared/validation/auth';
import { API } from '@resisure/shared/api/endpoints';
```

## OpenAPI contract

The HTTP contract is documented in [`docs/openapi.yaml`](../../docs/openapi.yaml) and served at `GET /api/openapi.yaml` when the API is running.
