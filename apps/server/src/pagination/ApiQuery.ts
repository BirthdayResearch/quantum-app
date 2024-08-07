import { Transform, Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Min } from 'class-validator';

/**
 * Pagination query with
 * - size as limit/count/max query
 * - next token for next slice/page
 *
 * This provides a singular consistent query pattern
 */
export class PaginationQuery {
  @IsOptional()
  @IsInt()
  @Transform(({ value }) => (value > 200 ? 200 : value))
  @Min(1)
  @Type(() => Number)
  size: number = 10;

  @IsOptional()
  @IsString()
  next?: string;
}
