# @poppinss/defer

<br />

[![gh-workflow-image]][gh-workflow-url] [![npm-image]][npm-url] ![][typescript-image] [![license-image]][license-url]

## Introduction

The `@poppinss/defer` package allows you to run async operations in the background using an in-memory queue. Think of it as `setImmediate` but with support for **monitoring**, **error handling**, and the ability to **gracefully shutdown process** by flushing the queue.

## Installation and usage

Use the following command to install the package from the npm packages registry.

```sh
npm i @poppinss/defer
```

Once installed, you can create an instance of the `DeferQueue` class and start pushing tasks to it using the `push` method.

```ts
import { DeferQueue } from '@poppinss/defer'
const queue = new DeferQueue()

queue.push(async function taskOne() {
  console.log('The method will be called in the background')
})

console.log('Will be logged before the above log')
```

You may also register a task as an object with `name` and `run` properties. The `name` is used for monitoring and the `run` method is the implementation callback.

```ts
queue.push({
  name: 'taskOne',
  async run() {
    console.log('The method will be called in the background')
  },
})
```

### Monitoring queue for completed tasks and errors

Since the callback provided to the `queue.push` method runs in the background, there is no way to immediately await the callback to access the result or handle errors. Instead, you must use the `onError` and `taskCompleted` methods to monitor the queue.

```ts
queue.onError = function (error, task) {
  console.log(`${task.name} task failed with the following error`)
  console.log(error)
}

queue.taskCompleted = function (task) {
  console.log(`${task.name} completed. ${queue.size()} tasks left`)
}
```

You may use the `query.drained` method to get notified when the worker has processed the last task.

```ts
queue.drained = function () {
  console.log('Processed last task in the queue')
}
```

### Pausing/resuming the queue

You may pause the queue from processing tasks using the `queue.pause` method and resume it using the `queue.resume` method.

```ts
queue.pause()

queue.push(async function taskOne() {})
queue.push(async function taskTwo() {})
queue.push(async function taskThree() {})

queue.size() // 3

// Start processing tasks
queue.resume()
```

### Killing the queue

You may remove all the tasks from the queue using the `queue.kill` method. This method removes all the pending tasks from the queue and invokes the `drain` handler.

```ts
process.on('beforeExit', () => {
  queue.kill()
})
```

### Concurrency

By default, 10 tasks are processed concurrently. However, you can specify the concurrency at the time of creating the queue instance.

```ts
const queue = new DeferQueue({ concurrency: 4 })
```

## Testing

When writing tests, you may want to immediately get notified when the queue has processed a task. You can do that by creating a monitoring promise before performing the task and `await` the promise after performing the task.

```ts
import { DeferQueue } from '@poppinss/defer'
export const queue = new DeferQueue()

export function refreshCache() {
  queue.push(async () => {
    const users = await User.all()
    cache.set('users', users)
  })
}
```

In the following example, when we call the `refreshCache` method, we have no way of knowing when the underlying promise will be resolved, so we cannot write assertions.

```ts
// Test file
import { refreshCache } from './some-file.js'

refreshCache()
// HOW DO WE KNOW IF THE CACHE WAS REFRESHED??
```

You can linearly `await` the completion of a task using the `queue.createNotifier` method. The `createNotifier` method returns a promise that will be resolved after completing the task.

```ts
import { queue, refreshCache } from './some-file.js'

const notifier = queue.createNotifier()
refreshCache()

await notifier
/**
 * Task has been processed. You can now check if the
 * cache has been refreshed
 */
```

## Contributing

One of the primary goals of Poppinss is to have a vibrant community of users and contributors who believe in the principles of the framework.

We encourage you to read the [contribution guide](https://github.com/poppinss/.github/blob/main/docs/CONTRIBUTING.md) before contributing to the framework.

## Code of Conduct

In order to ensure that the Poppinss community is welcoming to all, please review and abide by the [Code of Conduct](https://github.com/poppinss/.github/blob/main/docs/CODE_OF_CONDUCT.md).

## License

Poppinss defer is open-sourced software licensed under the [MIT license](LICENSE.md).

[gh-workflow-image]: https://img.shields.io/github/actions/workflow/status/poppinss/defer/checks.yml?style=for-the-badge
[gh-workflow-url]: https://github.com/poppinss/defer/actions/workflows/checks.yml 'Github action'
[typescript-image]: https://img.shields.io/badge/Typescript-294E80.svg?style=for-the-badge&logo=typescript
[typescript-url]: "typescript"
[npm-image]: https://img.shields.io/npm/v/@poppinss/defer.svg?style=for-the-badge&logo=npm
[npm-url]: https://npmjs.org/package/@poppinss/defer 'npm'
[license-image]: https://img.shields.io/npm/l/@poppinss/defer?color=blueviolet&style=for-the-badge
[license-url]: LICENSE.md 'license'
