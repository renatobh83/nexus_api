import type { Prisma } from "@prisma/client";

export const PUBLIC_COMPANY_SELECT = {
  id: true,
  cnpj: true,
  legalName: true,
  tradeName: true,
  description: true,
  email: true,
  phone: true,
  postalCode: true,
  street: true,
  number: true,
  complement: true,
  neighborhood: true,
  city: true,
  state: true,
  country: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.CompanySelect;

export type PublicCompanyRecord = Prisma.CompanyGetPayload<{
  select: typeof PUBLIC_COMPANY_SELECT;
}>;

/*
 * A seleção única evita que novos campos adicionados ao modelo sejam expostos
 * automaticamente pelas consultas administrativas.
 */
