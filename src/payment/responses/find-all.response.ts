import { ApiProperty } from "@nestjs/swagger";
import { PaymentResponse } from "../responses";

export class FindAllResponse {
  @ApiProperty({ type: [PaymentResponse] })
  payments: [PaymentResponse];

  @ApiProperty({ type: Number, example: 9 })
  count: number;

  @ApiProperty({ type: Number, example: 1 })
  page: number = 1;

  @ApiProperty({ type: Number, example: 10 })
  pageSize: number = 10;

  @ApiProperty({ type: Number, default: 3 })
  pageCount: number;
}
