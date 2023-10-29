import { mount } from 'alien-dom'
import 'alien-dom/global'
import './main.css'

import { App } from './components/App'

mount(document.body, <App tests={import.meta.glob('./tests/*.tsx')} />)
