import { ApiProperty } from "@nestjs/swagger";
import { Status } from "@repo/database";

export class PaymentResponse {
  @ApiProperty({
    example: 3,
    description: "Идентификатор платежа",
    type: Number,
  })
  id: string;

  @ApiProperty({
    example: "8cbabbe9-5fff-4dbe-a77e-104bf4e63dbe",
    description: "Идентификатор пользователя",
    type: String,
  })
  userId: string;

  @ApiProperty({
    example: 7,
    description: "Идентификатор фильма",
    type: Number,
  })
  movieId: string;

  @ApiProperty({
    example: 1000,
    description: "Сумма платежа",
    type: Number,
  })
  total: number;

  @ApiProperty({
    example: 3,
    description: "Количество билетов платежа",
    type: Number,
  })
  amount: number;

  @ApiProperty({
    example: "2021-12-31T23:59:59.000Z",
    description: "Дата создания платежа",
    type: Date,
  })
  createdAt: Date;

  @ApiProperty({
    enum: Status,
    default: Status.SUCCESS,
  })
  status: Status;
}
