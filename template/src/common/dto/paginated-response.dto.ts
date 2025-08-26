import { ApiProperty } from '@nestjs/swagger';

export class PaginatedResponseDto<T> {
  @ApiProperty()
  total: number;

  @ApiProperty()
  limit: number;

  @ApiProperty()
  currentPage: number;

  @ApiProperty()
  firstPage: number;

  @ApiProperty()
  lastPage: number;

  @ApiProperty()
  nextPage: number | null;

  @ApiProperty()
  previousPage: number | null;

  @ApiProperty({ isArray: true })
  data: T[];
}
