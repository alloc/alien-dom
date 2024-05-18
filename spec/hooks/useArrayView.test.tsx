import test from 'ava'
import { arrayRef, ref } from 'core/observable'
import { flushMicroTasks } from 'flush-microtasks'
import { useArrayView } from 'hooks/useArrayView'
import { useEffect } from 'hooks/useEffect'
import '../setup/cleanup'

test('useArrayView: render numbers to divs', async t => {
  const array = arrayRef([1, 2, 3])

  function Test() {
    return useArrayView(array, (item, key) => {
      return <div key={key}>{item}</div>
    })
  }

  const test = <Test />

  // At first, an empty text node is returned to act as a placeholder.
  t.snapshot(test.toString())

  // Mount to the document so effects are fired. Wrap the test in a div for
  // inspection, since the <Test> fragment will be visibly empty once mounted.
  const container = <div>{test}</div>
  document.body.appendChild(container)
  t.snapshot(container.toString())

  // Upon being mounted, the ArrayView will render the array items into the
  // `container` parent node.
  await flushMicroTasks()
  t.snapshot(container.toString())

  // Take a snapshot after each possible mutation.
  const mutations = [
    // Add 4, 5, 6 to end.
    () => array.push(4, 5, 6),
    // Add -1 and 0 to start.
    () => array.unshift(-1, 0),
    // Remove 6.
    () => array.pop(),
    // Remove -1.
    () => array.shift(),
    // Replace 2 and 3 with 200 and 300.
    () => array.splice(2, 2, 200, 300),
    // Replace 1 with 100.
    () => void (array[1] = 100),
    // Truncate array to 0, 100, 200, 300.
    () => void (array.length = 4),
    // Expand array with 3 empty slots.
    () => void (array.length = 7),
    // Replace everything with 1, 2, 3.
    () => void (array.value = [1, 2, 3]),
  ]

  for (const mutation of mutations) {
    mutation()

    await flushMicroTasks()
    t.snapshot(container.toString(), mutation.toString())
  }
})

test('useArrayView: rerender items', async t => {
  const array = arrayRef([1, 2])
  const mountedRef = ref(true)

  function Test() {
    const mounted = mountedRef.value
    return useArrayView(array, (item, key) => {
      return mounted && <div key={key}>{item}</div>
    })
  }

  document.body.append(<Test />)
  await flushMicroTasks()
  t.snapshot(document.body.innerHTML)

  // Unmount all array items through a parent component update.
  mountedRef.value = false
  await flushMicroTasks()
  t.snapshot(document.body.innerHTML)

  mountedRef.value = true
  await flushMicroTasks()
  t.snapshot(document.body.innerHTML)
})

// Ensure that composite elements returned for array items will have their
// component instances reused whenever the render function changes.
test.only('useArrayView: rerender item component', async t => {
  const array = arrayRef([1, 2])
  const offsetRef = ref(0)

  const unmounts: any[] = []

  function Item(props: { k: string; value: number }) {
    useEffect(
      () => () => {
        unmounts.push(props.k)
      },
      []
    )

    return <div>{props.value}</div>
  }

  function Test() {
    const offset = offsetRef.value
    return useArrayView(array, (item, key) => {
      console.log('key =', key)
      return <Item value={item + offset} k={key} key={key} />
    })
  }

  document.body.append(<Test />)
  await flushMicroTasks()
  t.snapshot(document.body.innerHTML)

  offsetRef.value = 1
  await flushMicroTasks()
  t.snapshot(document.body.innerHTML)

  offsetRef.value = 2
  await flushMicroTasks()
  t.snapshot(document.body.innerHTML)

  offsetRef.value = 3
  await flushMicroTasks()
  t.snapshot(document.body.innerHTML)

  t.deepEqual(unmounts, [])
})
