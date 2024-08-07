import { BadRequestException, PipeTransform } from '@nestjs/common';

export class EnumValidationPipe<T extends Record<string, string>> implements PipeTransform {
  constructor(
    private enumType: T,
    private defaultValue?: T[keyof T],
    private exceptionFactory?: () => Error,
  ) {}

  transform(value: any): any {
    if (!value && this.defaultValue !== undefined) {
      return this.defaultValue;
    }
    if (!value && !this.defaultValue) return undefined;

    const doesEnumExist = this.enumType[value];
    if (!doesEnumExist) {
      throw this.exceptionFactory
        ? this.exceptionFactory()
        : new BadRequestException(
            `Invalid query parameter value. See the acceptable values: ${Object.keys(this.enumType)
              .map((key) => this.enumType[key])
              .join(', ')}`,
          );
    }

    return value;
  }
}
