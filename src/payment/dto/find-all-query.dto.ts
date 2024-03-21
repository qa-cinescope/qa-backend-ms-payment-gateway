import { ApiProperty } from "@nestjs/swagger";
import { Status } from "@prisma/client";
import { Transform } from "class-transformer";
import { IsEnum, IsNumber, IsOptional, IsString, Max, Min } from "class-validator";

enum Sort {
  ASC = "asc",
  DESC = "desc",
}

export class FindAllQueryDto {
  @ApiProperty({
    minimum: 1,
    title: "page",
    default: 1,
    required: false,
  })
  @IsOptional()
  @IsNumber({}, { message: "Поле page должно быть числом" })
  @Min(1, { message: "Поле page имеет минимальную величину 1" })
  readonly page: number = 1;

  @ApiProperty({
    minimum: 1,
    maximum: 20,
    title: "pageSize",
    default: 10,
    required: false,
  })
  @IsOptional()
  @IsNumber({}, { message: "Поле pageSize должно быть числом" })
  @Min(1, { message: "Поле pageSize имеет минимальную величину 1" })
  @Max(20, { message: "Поле pageSize имеет максимальную величину 20" })
  pageSize: number = 10;

  @ApiProperty({
    enum: Status,
    default: Status.SUCCESS,
    example: Object.values(Status),
    title: "status",
    required: false,
    type: String,
  })
  @IsOptional()
  @IsString({ message: "Поле status должно быть строкой" })
  @Transform(({ value }) => value.toUpperCase())
  @IsEnum(Status, { message: "Поле status имеет недопустимое значение" })
  readonly status: Status;

  @ApiProperty({
    type: String,
    title: "createdAt",
    default: "asc",
    required: false,
    enum: Sort,
  })
  @IsOptional()
  @IsString({
    message: "Поле createdAt должно быть строкой",
  })
  @IsEnum(Sort, { message: "Поле createdAt имеет недопустимое значение" })
  @Transform(({ value }) => (typeof value === "string" && value ? value : "asc"))
  readonly createdAt: Sort = Sort.DESC;
}
