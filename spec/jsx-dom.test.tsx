import test from 'ava'
import './setup/cleanup'

let app: HTMLElement

test('most basic component example', t => {
  function App() {
    return <div class="color-red" />
  }

  app = <App />
  t.snapshot(app.toString())
})

test('component with children prop', t => {
  function App(props: any) {
    return <div class="color-red">{props.children}</div>
  }

  app = (
    <App>
      <h1>Hello World</h1>
    </App>
  )
  t.snapshot(app.toString())
})

test('component with fragment as root node', t => {
  function App(props: any) {
    return (
      <>
        <h1>{props.title}</h1>
        <p>{props.children}</p>
      </>
    )
  }

  app = <App title="Hello">Welcome to my app!</App>
  t.snapshot(app.toString())
})
