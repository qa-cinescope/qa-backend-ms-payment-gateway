import { Status } from "@repo/database";

export class PaymentRegistryDto {
  userId: string;
  movieId: number;
  total: number;
  amount: number;
  status: Status;
}
