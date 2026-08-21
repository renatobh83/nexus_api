import { redis } from "../../../config/redis.js";
import { signRegistrationToken } from "../../../modules/auth/jwt.js";
import { customAlphabet } from "nanoid";

const { FRONTEND_URL, BACKEND_URL } = process.env;

export const generateRegistrationLink = async (cpf: string) => {
  const payload = { identifier: cpf };

  const token = signRegistrationToken(payload);

  // Link original com o token
  const fullUrl = `${FRONTEND_URL}/register?token=${token}`;

  const nanoidSafe = customAlphabet(
    "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz",
    6,
  );
  // Encurta com Redis
  const code = nanoidSafe();
  const expireSeconds = 15 * 60;

  await redis.setex(`short:${code}`, expireSeconds, fullUrl);

  const shortUrl = `${BACKEND_URL}/api/v1/r/${code}`;

  return shortUrl;
};
