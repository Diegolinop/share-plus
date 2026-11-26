import CadastrarAssinatura from './pages/CadastrarAssinatura'
import Grupos from './pages/Grupos'

export default function App() {
  const grupos = /^\/grupos\/?$/.test(window.location.pathname)
  return <>
    <nav aria-label="Navegação principal" className="flex justify-center gap-6 bg-violet-900 px-5 py-3 text-white">
      <a aria-current={grupos ? undefined : 'page'} href="/">Cadastrar assinatura</a>
      <a aria-current={grupos ? 'page' : undefined} href="/grupos">Meus grupos</a>
    </nav>
    {grupos ? <Grupos /> : <CadastrarAssinatura />}
  </>
}
