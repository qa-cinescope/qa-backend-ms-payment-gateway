import { ApiProperty } from "@nestjs/swagger";
import { Status } from "@prisma/client";

export class PaymentRegistryResponse {
  @ApiProperty({
    type: String,
    enum: Status,
    example: Status.SUCCESS,
    description: "Статус платежа",
  })
  status: Status;
}
