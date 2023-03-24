/**
 * Centralize logging/error reporting for log abstraction
 */
const Logging = {
  error(error: any): void {
    console.error(error);
  },
  info(message: string): void {
    console.log(message);
  },
};

export default Logging;
