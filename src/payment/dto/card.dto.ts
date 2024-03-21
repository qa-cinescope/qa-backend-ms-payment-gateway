import { ApiProperty } from "@nestjs/swagger";
import { IsNumber, IsString, Length, Max, Min } from "class-validator";

export class CardDto {
  @ApiProperty({
    type: String,
    example: "12345678901234567",
    description: "Номер карты",
  })
  @IsString({ message: "Поле card.cardNumber должно быть строкой" })
  @Length(16, 16, { message: "Поле card.cardNumber должно содержать 16 цифр" })
  cardNumber: string;

  @ApiProperty({
    type: String,
    example: "John Doe",
    description: "Имя владельца карты",
  })
  @IsString({ message: "Поле card.cardHolder должно быть строкой" })
  cardHolder: string;

  @ApiProperty({
    type: String,
    example: "12/24",
    description: "Срок действия карты",
  })
  @IsString({ message: "Поле card.expirationDate должно быть строкой" })
  @Length(5, 5, { message: "Поле card.expirationDate должно содержать 5 символов" })
  @IsString({ message: "Поле card.expirationDate должно быть строкой" })
  expirationDate: string;

  @ApiProperty({
    type: Number,
    example: 123,
    description: "Код безопасности карты",
  })
  @IsNumber({}, { message: "Поле card.securityCode должно быть числом" })
  @Min(0, { message: "Поле card.securityCode должно быть больше 0" })
  @Max(999, { message: "Поле card.securityCode должно быть меньше 1000" })
  securityCode: number;
}
