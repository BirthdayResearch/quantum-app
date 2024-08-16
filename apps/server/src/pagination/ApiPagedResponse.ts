/**
 * ApiPage for pagination ApiPagedResponse pagination
 * - `next` token indicate the token used to get the next slice window.
 */
export interface ApiPage {
  next?: string;
}
/**
 * TotalCount for getting totalCount of the number of queue
 */
export interface TotalCount {
  count: string;
}

/**
 * Universal response structure for 'module.api'
 */
export interface ApiResponse {
  data?: any;
  page?: ApiPage;
  totalCount?: TotalCount;
}

/* eslint-disable @typescript-eslint/no-extraneous-class */
/**
 * Raw Abstract ApiResponse class to bypass ResponseInterceptor.
 * Used by ApiPagedResponse to structure paged response structure.
 */
abstract class ApiRawResponse implements ApiResponse {}

/**
 * ApiPagedResponse, implements ApiResponse interface from response.interceptor.
 *
 * ApiPagedResponse indicates that this response of data array slice is part of a sorted list of items.
 * Items are part of a larger sorted list and the slice indicates a window within the large sorted list.
 * Each ApiPagedResponse holds the data array and the "token" for the next part of the slice.
 * The next token should be passed via @Query('next') and only used when getting the next slice.
 * Hence the first request, the next token is always empty and not provided.
 *
 * With ascending sorted list and a limit of 3 items per slice will have the behaviour as such.
 *
 * SORTED  : | [1] [2] [3] | [4] [5] [6] | [7] [8] [9] | [10]
 * Query 1 : Data: [1] [2] [3], Next: 3, Operator: GT (>)
 * Query 2 : Data: [4] [5] [6], Next: 6, Operator: GT (>)
 * Query 3 : Data: [7] [8] [9], Next: 9, Operator: GT (>)
 * Query 4 : Data: [10], Next: undefined
 *
 * This design is resilient also mutating sorted list, where pagination is not.
 *
 * SORTED  : [2] [4] [6] [8] [10] [12] [14]
 * Query 1 : Data: [2] [4] [6], Next: 6, Operator: GT (>)
 *
 * Being in a slice window, the larger sorted list can be mutated.
 * You only need the next token to get the next slice.
 * MUTATED : [2] [4] [7] [8] [9] [10] [12] [14]
 * Query 2 : Data: [7] [8] [9], Next: 6, Operator: GT (>)
 *
 * Limitations of this requires your data structure to always be sorted in one direction and your sort
 * indexes always fixed. Hence the moving down of that slice window, your operator will be greater than (GT).
 * While moving up your operator will be less than (GT).
 *
 * ASC  : | [1] [2] [3] | [4] [5] [6] | [7] [8] [9] |
 *                      >3            >6             >9
 * DESC : | [9] [8] [7] | [6] [5] [4] | [3] [2] [1] |
 *                      <7            <4            <1
 *
 * For developer quality life it's unwise to allow inclusive operator, it just creates more overhead
 * to understanding our services. No GTE or LTE, always GT and LE. Services must be clean and clear,
 * when the usage narrative is clear and so will the use of ease. LIST query must be dead simple.
 * Imagine travelling down the path, and getting a "next token" to get the next set of items to
 * continue walking.
 *
 * Because the limit is not part of the slice window your query mechanism should support varying size windows.
 *
 * DATA: | [1] [2] [3] | [4] [5] [6] [7] | [8] [9] | ...
 *       | limit 3, >3 | limit 4, >7     | limit 2, >9
 *
 * For simplicity your API should not attempt to allow access to different sort indexes, be cognizant of
 * how our APIs are consumed. If we create a GET /blocks operation to list blocks what would the correct indexes
 * be 99% of the time?
 *
 * Answer: Blocks sorted by height in descending order, that's your sorted list and your slice window.
 *       : <- Latest | [100] [99] [98] [97] [...] | Oldest ->
 */
export class ApiPagedResponse<T> extends ApiRawResponse {
  data: T[];

  page?: ApiPage;

  totalCount?: TotalCount;

  protected constructor(data: T[], next?: string, count?: string) {
    super();
    this.data = data;
    this.page = next !== undefined ? { next } : undefined;
    this.totalCount = count !== undefined ? { count } : undefined;
  }

  /**
   * @param {T[]} data array slice
   * @param {string} next token slice for greater than, less than operator
   * @param {TotalCount} count contains total count of the number of queues
   */
  static next<T>(data: T[], next?: string, count?: string): ApiPagedResponse<T> {
    return new ApiPagedResponse<T>(data, next, count);
  }

  /**
   * @param {T[]} data array slice ( array slice should be passing 1 more than limit in service to check for next page )
   * @param {number} limit number of elements in the data array slice
   * @param {(item: T) => string} nextProvider to get next token when ( data array > limit)
   * @param {TotalCount} count contains total count of the number of queues
   */
  static of<T>(data: T[], limit: number, nextProvider?: (item: T) => string, count?: string): ApiPagedResponse<T> {
    // if data.length > limit means that there is a next page
    if (data.length > limit && data.length > 0 && limit > 0 && nextProvider) {
      const next = nextProvider(data[limit]);
      // slice data to get data minus the additional queue that is used to check for next page
      return this.next(data.slice(0, data.length - 1), next, count);
    }

    return this.next(data, undefined, count);
  }

  static empty<T>(): ApiPagedResponse<T> {
    return new ApiPagedResponse<T>([]);
  }
}
