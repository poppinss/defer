/*
 * @poppinss/defer
 *
 * (c) Poppinss
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

export type QueueOptions = {
  concurrency: number
}

/**
 * Representation of the defer callback function. It
 * can be a callback function or an object with a
 * display name and the run method.
 */
export type DeferCallback =
  | (() => any)
  | {
      name: string
      run(): any
    }
