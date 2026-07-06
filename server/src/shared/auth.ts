import * as crypto from 'crypto';

const SECRET_KEY = 'watch-party-secret-key-12345';

export interface AuthPayload {
  userId: string;
  displayName: string;
}

export function generateToken(payload: AuthPayload): string {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  
  const signature = crypto
    .createHmac('sha256', SECRET_KEY)
    .update(`${header}.${body}`)
    .digest('base64url');
    
  return `${header}.${body}.${signature}`;
}

export function verifyToken(token: string): AuthPayload | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    
    const [header, body, signature] = parts;
    const expectedSignature = crypto
      .createHmac('sha256', SECRET_KEY)
      .update(`${header}.${body}`)
      .digest('base64url');
      
    if (signature !== expectedSignature) return null;
    
    return JSON.parse(Buffer.from(body, 'base64url').toString('utf8')) as AuthPayload;
  } catch (err) {
    return null;
  }
}
