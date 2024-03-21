import { Type } from "class-transformer";
import { IsNumber, IsObject, IsString, IsUUID, Min, ValidateNested } from "class-validator";
import { CardDto } from ".";
import { ApiProperty } from "@nestjs/swagger";

export class CreatePaymentDto {
  @ApiProperty({
    type: Number,
    example: 1,
    description: "Идентификатор фильма",
  })
  @IsNumber({}, { message: "Поле movieId должно быть числом" })
  @Min(1, { message: "Поле movieId должно быть больше 0" })
  movieId: number;

  @ApiProperty({
    type: Number,
    example: 1,
    description: "Количество билетов",
  })
  @IsNumber({}, { message: "Поле amount должно быть числом" })
  @Min(1, { message: "Поле amount должно быть больше 0" })
  amount: number;

  @ApiProperty({
    type: () => CardDto,
    description: "Карта",
  })
  @IsObject({ message: "Поле card должно быть объектом" })
  @ValidateNested({ each: true })
  @Type(() => CardDto)
  card: CardDto;
}
