import { Status } from "@prisma/client";

export class PaymentRegistryDto {
  userId: string;
  movieId: number;
  total: number;
  amount: number;
  status: Status;
}
