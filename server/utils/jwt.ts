import jwt from 'jsonwebtoken'


const getSecret = () => {
  const secret = process.env.JWT_SECRET || useRuntimeConfig().jwtSecret
  if (!secret) throw new Error('JWT_SECRET is not defined in environment variables')
  return secret
}

export interface JwtPayload {
  id: number
  username: string
  role: string | null
}

export const signToken = (payload: JwtPayload): string => {
  return jwt.sign(payload, getSecret(), { expiresIn: '7d' })
}

export const verifyToken = (token: string): JwtPayload => {
  return jwt.verify(token, getSecret()) as JwtPayload
}
