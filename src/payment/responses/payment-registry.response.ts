import { ApiProperty } from "@nestjs/swagger";
import { Status } from "@repo/database";

export class PaymentRegistryResponse {
  @ApiProperty({
    type: String,
    enum: Status,
    example: Status.SUCCESS,
    description: "Статус платежа",
  })
  status: Status;
}
