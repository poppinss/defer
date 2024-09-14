/*
 * @poppinss/defer
 *
 * (c) Poppinss
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import fastq from 'fastq'
import { DeferCallback, QueueOptions } from './types.js'

/**
 * Deferred promise encapsulates a promise that can be
 * resolved outside of the new Promise callback
 */
export class Deferred<T> {
  resolve!: (value: T | PromiseLike<T>) => void
  reject!: (reason?: any) => void
  promise: Promise<T> = new Promise<T>((resolve, reject) => {
    this.reject = reject
    this.resolve = resolve
  })
}

/**
 * Represents an in-memory queue to push tasks to be executed
 * to the background
 */
export class DeferQueue {
  /**
   * Custom drain callback assigned to the queue. We keep a
   * reference to it so that we can assign it back after
   * the kill method
   */
  #drainCallback?: () => any

  /**
   * Reference to the undelying fastq
   */
  #fastQueue: fastq.queue<DeferCallback>

  /**
   * Notifiers is a collection of promises that are invoked
   * when a task is completed and then removed from the
   * stack.
   *
   * You can create notifiers using the "createNotifier" method
   * to lineraly monitor the completion of a task
   */
  #notifiers: Deferred<PromiseSettledResult<{ name: string; response: any }>>[] = []

  /**
   * Notifies the onError and taskCompleted handlers
   */
  #notifier = (error: null | Error, taskResult: { name: string; response: any }) => {
    const awaitingNotifier = this.#notifiers.shift()

    /**
     * Notify the onError hook and the awaiting notifier about
     * the error
     */
    if (error) {
      if (this.onError) {
        this.onError(error, taskResult)
      }
      if (awaitingNotifier) {
        awaitingNotifier.resolve({ status: 'rejected', reason: error })
      }
      return
    }

    /**
     * Notify the taskCompleted hook and the awaiting notifier about
     * the error
     */
    if (this.taskCompleted) {
      this.taskCompleted(taskResult)
    }
    if (awaitingNotifier) {
      awaitingNotifier.resolve({ status: 'fulfilled', value: taskResult })
    }
  }

  /**
   * Function that listens for the errors on the queue
   */
  onError?: (error: unknown, taskResult: { name: string }) => void

  /**
   * Function that listens successful task completions
   */
  taskCompleted?: (taskResult: { name: string; response: unknown }) => void

  /**
   * Function that listens for new task additions
   */
  taskAdded?: (task: DeferCallback) => void

  /**
   * Function that is invoked when the last task is executed
   * by the worker
   */
  get drained(): (() => any) | undefined {
    return this.#fastQueue.drain
  }
  set drained(callback: () => any) {
    this.#drainCallback = callback
    this.#fastQueue.drain = callback
  }

  constructor(options?: Partial<QueueOptions>) {
    this.#fastQueue = fastq(async (cb, done) => {
      try {
        const response = await (typeof cb === 'function' ? cb() : cb.run())
        done(null, { name: cb.name, response })
      } catch (error) {
        done(error, { name: cb.name })
      }
    }, options?.concurrency ?? 10)
  }

  /**
   * Create a notifier in advance that will be resolved when
   * a queued task is completed.
   *
   * Notifiers must be used during testing to track the execution
   * of an async task.
   *
   * One notifier can only listen for a maximum of one task that will
   * be executed after the notifier has been created and after that
   * the notifier will be removed.
   */
  createNotifier<T>() {
    const deferred = new Deferred<PromiseSettledResult<{ name: string; response: T }>>()
    this.#notifiers.push(deferred)
    return deferred.promise
  }

  /**
   * Push a new callback (aka task) to the end of the queue.
   */
  push(task: DeferCallback): this {
    if (this.taskAdded) {
      this.taskAdded(task)
    }
    this.#fastQueue.push(task, this.#notifier)
    return this
  }

  /**
   * Push a new callback (aka task) to the start of the queue.
   */
  unshift(task: DeferCallback): this {
    if (this.taskAdded) {
      this.taskAdded(task)
    }
    this.#fastQueue.unshift(task, this.#notifier)
    return this
  }

  /**
   * Pause queue
   */
  pause(): void {
    this.#fastQueue.pause()
  }

  /**
   * Resume queue
   */
  resume(): void {
    this.#fastQueue.resume()
  }

  /**
   * Check if queue is currently idle
   */
  isIdle(): boolean {
    return this.#fastQueue.idle()
  }

  /**
   * Get the size of tasks in the queue
   */
  size(): number {
    return this.#fastQueue.length()
  }

  /**
   * Kill the queue and reset the drain method to a
   * noop function.
   *
   * The drain method will be called before the queue gets
   * killed
   */
  kill(): void {
    this.#fastQueue.killAndDrain()
    if (this.#drainCallback) {
      this.#fastQueue.drain = this.#drainCallback
    }
  }
}
