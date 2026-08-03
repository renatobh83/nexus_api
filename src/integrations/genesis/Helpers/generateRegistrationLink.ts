import jwt from "jsonwebtoken";
import { redis } from "../../../config/redis.js";
import { customAlphabet } from "nanoid";

const { FRONTEND_URL, BACKEND_URL } = process.env;

export const generateRegistrationLink = async (
  cpf: string,

) => {

  const payload = { identifier: cpf };

  const token = jwt.sign(
    payload,
    "78591a1f59eda6e939d7a7752412b364a5218eef12a839616af49080860273c7",
    { expiresIn: "65m" }
  );

  // Link original com o token
  const fullUrl = `${FRONTEND_URL}/register?token=${token}`;

  const nanoidSafe = customAlphabet(
    "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz",
    6
  );
  // Encurta com Redis
  const code = nanoidSafe();
  const expireSeconds = 15 * 60;

  await redis.setex(`short:${code}`, expireSeconds, fullUrl);

  const shortUrl = `${BACKEND_URL}/api/v1/r/${code}`;

  return shortUrl;
};