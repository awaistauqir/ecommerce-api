# Email Verification & Password Reset Feature

This document describes the email verification and password reset features implemented using the Resend package.

## Environment Variables Required

Add these to your `.env` file:

```env
RESEND_API_KEY=re_xxxxxxxxxxxxxxxx
EMAIL_FROM=your-verified-domain@resend.dev  # or use default: onboarding@resend.dev
FRONTEND_URL=http://localhost:5173  # Your frontend URL for email links
```

## New API Endpoints

### 1. Email Verification Flow

#### POST /api/v1/auth/register
Registers a new user and automatically sends a verification email.

**Response:**
```json
{
  "success": true,
  "message": "User registered successfully. Please check your email to verify your account.",
  "data": {
    "user": {
      "id": "...",
      "name": "John Doe",
      "email": "john@example.com",
      "isEmailVerified": false
    }
  }
}
```

#### GET /api/v1/auth/verify-email?token={token}
Verifies the user's email address using the token from the email link.

**Query Parameters:**
- `token` (required): The verification token sent via email

**Response:**
```json
{
  "success": true,
  "message": "Email verified successfully. You can now log in.",
  "data": {
    "user": {
      "id": "...",
      "email": "john@example.com",
      "isEmailVerified": true
    }
  }
}
```

#### POST /api/v1/auth/resend-verification
Resends the verification email if the user didn't receive it.

**Request Body:**
```json
{
  "email": "john@example.com"
}
```

### 2. Password Reset Flow

#### POST /api/v1/auth/forgot-password
Sends a password reset email to the user.

**Request Body:**
```json
{
  "email": "john@example.com"
}
```

**Response:**
```json
{
  "success": true,
  "message": "If an account exists with this email, a password reset link has been sent."
}
```

*Note: Always returns success message to prevent email enumeration attacks.*

#### POST /api/v1/auth/reset-password
Resets the user's password using the token from the email link.

**Request Body:**
```json
{
  "token": "abc123...",
  "password": "newpassword123"
}
```

### 3. Updated Login Behavior

#### POST /api/v1/auth/login
Now requires email verification before allowing login.

**Error Response (if email not verified):**
```json
{
  "success": false,
  "message": "Please verify your email before logging in"
}
```

## Database Schema Changes

The User model now includes:

```typescript
{
  isEmailVerified: boolean;           // Default: false
  emailVerificationToken?: string;    // Hashed token
  emailVerificationExpires?: Date;    // Token expiration (1 hour)
  passwordResetToken?: string;        // Hashed token
  passwordResetExpires?: Date;        // Token expiration (1 hour)
}
```

## Implementation Details

### Security Features

1. **Token Hashing**: All tokens are hashed using SHA-256 before storing in the database
2. **Token Expiration**: Tokens expire after 1 hour
3. **Email Enumeration Prevention**: Forgot password endpoint doesn't reveal if email exists
4. **Refresh Token Invalidation**: Password reset invalidates all existing refresh tokens

### Email Templates

Professional HTML email templates are used for:
- Email verification (with green CTA button)
- Password reset (with blue CTA button)

Both include:
- Clear call-to-action button
- Fallback plain text link
- Expiration notice
- Security disclaimer

## Frontend Integration

Your frontend should handle these routes:

1. `/verify-email?token={token}&userId={userId}` - Email verification page
2. `/reset-password?token={token}&email={email}` - Password reset page

## Usage Example

### Register and Verify Email

```javascript
// 1. Register
const registerResponse = await fetch('/api/v1/auth/register', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    name: 'John Doe',
    email: 'john@example.com',
    password: 'secret123'
  })
});

// 2. User clicks link in email: 
// http://localhost:5173/verify-email?token=abc123&userId=xyz789

// 3. Frontend calls verification endpoint
const verifyResponse = await fetch('/api/v1/auth/verify-email?token=abc123', {
  method: 'GET'
});

// 4. Now user can login
```

### Password Reset

```javascript
// 1. Request reset
await fetch('/api/v1/auth/forgot-password', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: 'john@example.com' })
});

// 2. User clicks link in email:
// http://localhost:5173/reset-password?token=abc123&email=john@example.com

// 3. Frontend submits new password
await fetch('/api/v1/auth/reset-password', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    token: 'abc123',
    password: 'newpassword123'
  })
});
```

## Files Modified/Created

### Created:
- `src/utils/email.service.ts` - Email sending service using Resend

### Modified:
- `src/config/env.ts` - Added RESEND_API_KEY and EMAIL_FROM env vars
- `src/features/users/users.model.ts` - Added email verification fields
- `src/features/users/users.service.ts` - Added token generation/verification methods
- `src/features/auth/auth.controller.ts` - Added verification and password reset endpoints
- `src/features/auth/auth.routes.ts` - Added new routes
- `src/features/auth/auth.schema.ts` - Added validation schemas

## Testing

Make sure to:
1. Set up a verified domain or email in Resend dashboard
2. Add your RESEND_API_KEY to .env
3. Test the complete flow: register → verify email → login → forgot password → reset password
