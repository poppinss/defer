/*
 * @poppinss/defer
 *
 * (c) Poppinss
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { test } from '@japa/runner'
import { DeferQueue } from '../src/queue.js'

test.group('Queue', () => {
  test('add callback to the queue and execute it', async ({ expect }) => {
    const tasks: any[] = []
    const queue = new DeferQueue()

    queue.taskAdded = function (task) {
      tasks.push(task)
    }
    queue.taskCompleted = function (taskResult) {
      tasks.push(taskResult)
    }
    queue.onError = function (task) {
      tasks.push(task)
    }

    const notifier = queue.createNotifier()
    queue.push(async function sendEmail() {
      return { sent: true }
    })

    const response = await notifier
    expect(response).toEqual({
      status: 'fulfilled',
      value: {
        name: 'sendEmail',
        response: { sent: true },
      },
    })
    expect(tasks).toHaveLength(2)
    expect(tasks).toEqual([
      expect.any(Function),
      expect.objectContaining({ name: 'sendEmail', response: { sent: true } }),
    ])
  })

  test('add object based task to be queue', async ({ expect }) => {
    const tasks: any[] = []
    const queue = new DeferQueue()

    queue.taskAdded = function (task) {
      tasks.push(task)
    }
    queue.taskCompleted = function (taskResult) {
      tasks.push(taskResult)
    }
    queue.onError = function (task) {
      tasks.push(task)
    }

    const notifier = queue.createNotifier()
    queue.push({
      name: 'sendEmail',
      async run() {
        return { sent: true }
      },
    })

    const response = await notifier
    expect(response).toEqual({
      status: 'fulfilled',
      value: {
        name: 'sendEmail',
        response: { sent: true },
      },
    })
    expect(tasks).toHaveLength(2)
    expect(tasks).toEqual([
      expect.objectContaining({ name: 'sendEmail', run: expect.any(Function) }),
      expect.objectContaining({ name: 'sendEmail', response: { sent: true } }),
    ])
  })

  test('handle task failures', async ({ expect }) => {
    const tasks: any[] = []
    const queue = new DeferQueue()
    let error: any

    queue.taskAdded = function (task) {
      tasks.push(task)
    }
    queue.taskCompleted = function (taskResult) {
      tasks.push(taskResult)
    }
    queue.onError = function (e, task) {
      error = e
      tasks.push(task)
    }

    const notifier = queue.createNotifier()
    queue.push(async function sendEmail() {
      throw new Error('failed')
    })

    const response = await notifier
    expect(response).toEqual({
      status: 'rejected',
      reason: error,
    })
    expect(tasks).toHaveLength(2)
    expect(error).toEqual(expect.any(Error))
    expect(tasks).toEqual([expect.any(Function), expect.objectContaining({ name: 'sendEmail' })])
  })

  test('notify drained handler', async ({ expect }) => {
    let drained = false
    const queue = new DeferQueue()

    expect(queue.drained).toEqual(expect.any(Function)) // noop
    queue.drained = function () {
      drained = true
    }

    const notifier = queue.createNotifier()
    queue.push(async function sendEmail() {
      return { sent: true }
    })

    const response = await notifier
    expect(response).toEqual({
      status: 'fulfilled',
      value: {
        name: 'sendEmail',
        response: {
          sent: true,
        },
      },
    })

    expect(drained).toBe(true)
  })

  test('push to the front of the queue', async ({ expect }) => {
    const tasks: any[] = []
    const queue = new DeferQueue()

    queue.taskAdded = function (task) {
      tasks.push(task)
    }
    queue.taskCompleted = function (taskResult) {
      tasks.push(taskResult)
    }
    queue.onError = function (task) {
      tasks.push(task)
    }
    queue.pause()

    const createInvoiceNotifier = queue.createNotifier()
    const sendEmailNotifier = queue.createNotifier()

    queue.unshift(async function sendEmail() {
      return { sent: true }
    })
    queue.unshift(async function createInvoice() {
      return { created: true }
    })

    queue.resume()

    expect(await createInvoiceNotifier).toEqual({
      status: 'fulfilled',
      value: {
        name: 'createInvoice',
        response: { created: true },
      },
    })
    expect(await sendEmailNotifier).toEqual({
      status: 'fulfilled',
      value: {
        name: 'sendEmail',
        response: { sent: true },
      },
    })

    expect(tasks).toHaveLength(4)
    expect(tasks).toEqual([
      expect.any(Function),
      expect.any(Function),
      expect.objectContaining({ name: 'createInvoice', response: { created: true } }),
      expect.objectContaining({ name: 'sendEmail', response: { sent: true } }),
    ])
  })

  test('check if queue is idle', async ({ expect }) => {
    const queue = new DeferQueue()
    expect(queue.isIdle()).toBe(true)

    const notifier = queue.createNotifier()
    queue.push(async function sendEmail() {
      return { sent: true }
    })

    expect(queue.isIdle()).toBe(false)

    const response = await notifier
    expect(response).toEqual({
      status: 'fulfilled',
      value: {
        name: 'sendEmail',
        response: { sent: true },
      },
    })
  })

  test('get size of tasks in queue', async ({ expect }) => {
    const queue = new DeferQueue()
    expect(queue.size()).toEqual(0)

    queue.pause()
    queue.push(async function sendEmail() {
      return { sent: true }
    })
    expect(queue.size()).toEqual(1)

    queue.resume()
    expect(queue.size()).toEqual(0)
  })

  test('kill and drain queue', async ({ expect }) => {
    let drained = false
    const queue = new DeferQueue()

    queue.drained = function () {
      drained = true
    }

    queue.pause()
    queue.push(async function sendEmail() {
      return { sent: true }
    })
    queue.kill()

    expect(queue.size()).toEqual(0)
    expect(drained).toEqual(true)
  })

  test('push task after killing the queue', async ({ expect }) => {
    let drained = false
    const queue = new DeferQueue()
    queue.drained = function () {
      drained = true
    }

    queue.kill()

    const notifier = queue.createNotifier()
    queue.push(async function sendEmail() {
      return { sent: true }
    })

    await notifier
    expect(drained).toEqual(true)
  })
})
