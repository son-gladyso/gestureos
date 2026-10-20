# GestureOS

[简体中文](README.zh-CN.md) · [English](../../README.md) · [日本語](README.ja.md) · [한국어](README.ko.md) · [Español](README.es.md) · [Français](README.fr.md) · [Deutsch](README.de.md) · [Português (Brasil)](README.pt-BR.md) · [Русский](README.ru.md) · [繁體中文](README.zh-TW.md)

**Transforme um gesto de pinça, uma mão aberta ou um punho fechado em uma interação com uma cena de partículas no navegador.**

GestureOS é um pequeno ambiente experimental para desenvolvedores de programação criativa e qualquer pessoa interessada em interação por câmera. Ele combina o rastreamento de mãos do MediaPipe com efeitos visuais de partículas e mantém as regras dos gestos separadas da renderização, para você explorar tanto o efeito quanto seu funcionamento.

Os quadros da câmera permanecem no navegador e não são enviados por este projeto. A demonstração usa o MediaPipe de uma CDN durante a execução, portanto a primeira inicialização exige acesso à rede.

[Experimentar localmente](#run-locally) · [Cenários de gestos](#what-to-try) · [Solução de problemas](#troubleshooting) · [Contribuir](#help-improve-gestureos)

<a id="why-try-it"></a>

## Por que experimentar?

Explore a interação por câmera sem construir do zero um pipeline de rastreamento de mãos. O GestureOS conecta um classificador de gestos pequeno e inspecionável a uma cena de partículas no navegador, para você experimentar a interação e entender as regras por trás dela.

- Experimente três estados de gesto explícitos: pinça, mão aberta e punho fechado, com um estado alternativo de rastreamento.
- Inspecione o classificador independentemente da câmera e do loop de renderização.
- Mantenha os quadros da câmera no navegador, lembrando que as bibliotecas de execução ainda são carregadas de uma CDN.

Esta é uma cena experimental no navegador, não um sistema operacional substituto nem uma ferramenta para controlar outros aplicativos de desktop. O comportamento dos gestos depende da posição da câmera, da iluminação e da nitidez com que sua mão aparece.

<a id="what-to-try"></a>

## O que experimentar

| Cenário | O que observar | Por que isso importa |
| --- | --- | --- |
| Passar de uma mão aberta para um punho fechado | O estado detectado e a resposta correspondente das partículas | Relacione uma ação física a uma resposta visível no navegador. |
| Aproximar o polegar e o indicador | A classificação de pinça | Explore um gesto pequeno e explícito em vez de um vocabulário de comandos opaco. |
| Manter uma pose perto de um limite de detecção | Mudanças de estado conforme variam as distâncias entre pontos de referência | Entenda por que a distância da câmera e a escolha dos limiares importam. |
| Alterar uma regra do classificador | Um teste focado e a cena ao vivo | Desenvolva o comportamento da interação sem misturá-lo ao loop de renderização. |

O classificador usa limiares de distância entre pontos de referência, não um modelo de gestos personalizado e treinado. Seus limiares podem ser inspecionados, mas isso não comprova a precisão entre diferentes usuários, câmeras ou distâncias de observação.

<a id="try-the-interaction"></a>

## Experimente a interação

Siga [Executar localmente](#run-locally), permita o acesso à câmera e experimente uma mão aberta, um punho fechado e uma pinça com polegar e indicador. Compare o estado detectado com a resposta visível da cena. Se o rastreamento for inconsistente, altere a iluminação ou a distância antes de interpretá-lo como um resultado do classificador.

Este README ainda não inclui uma demonstração gravada com uma câmera real. As etapas acima permitem inspecionar o aplicativo real; elas não afirmam que todas as câmeras ou todos os navegadores foram validados.

<a id="requirements"></a>

## Requisitos

- Node.js 20+ (o projeto usa atualmente Node 24 na verificação local)
- Um navegador moderno com acesso à câmera
- HTTPS ou `localhost` (exigência das APIs de câmera)

<a id="run-locally"></a>

## Executar localmente

1. Instale as dependências:

```bash
npm install
```

2. Disponibilize esta pasta com um servidor estático local. Exemplo:

```bash
npx http-server . -p 8080
```

3. Abra `http://localhost:8080` e permita que esta página use a câmera.

**Sua primeira verificação bem-sucedida:** a página mostra uma interação controlada pela câmera, e alternar entre mão aberta, punho fechado e pinça produz mudanças observáveis no estado ou na cena. Se a página carregar, mas o rastreamento não funcionar, siga as etapas de solução de problemas abaixo; carregar a página, por si só, não é um teste de aceitação da câmera.

O comando do servidor estático usa `npx` e pode baixar `http-server` se ele ainda não estiver disponível. Os scripts do MediaPipe em tempo de execução e as fontes web também usam hosts externos; o processamento local da câmera não significa que a primeira inicialização seja totalmente offline.

<a id="quality-commands"></a>

## Comandos de qualidade

- `npm run lint`: verificações do ESLint
- `npm run format:check`: verificação do Prettier
- `npm test`: testes unitários + verificações de integridade
- `npm run check`: lint + formatação + testes

<a id="project-structure"></a>

## Estrutura do projeto

- `index.html`: estrutura do aplicativo e layout da interface
- `styles.css`: sistema visual e animações
- `script.js`: loop de execução, partículas, gestos e ciclo de vida da câmera
- `gesture-config.js`: constantes imutáveis de execução
- `gesture-helpers.js`: funções utilitárias compartilhadas
- `gesture-detector.js`: lógica pura de classificação de gestos
- `gesture-policies.js`: decisões de políticas de qualidade/câmera e mapeamento de erros
- `tests/run-tests.mjs`: verificações unitárias de configuração, utilitários, detector e políticas
- `scripts/quality-check.mjs`: verificações rigorosas de UTF-8 e integridade estrutural

<a id="troubleshooting"></a>

## Solução de problemas

- Se a câmera falhar, verifique as permissões e feche outros aplicativos que a estejam usando.
- Se estiver executando em um host remoto, use HTTPS.
- Se os scripts da CDN não carregarem, verifique o acesso de rede a `cdn.jsdelivr.net`.

<a id="common-questions"></a>

### Perguntas frequentes

**Ele pode controlar meu desktop ou outros aplicativos?** Não. A interação se limita a esta demonstração no navegador.

**Posso abrir `index.html` diretamente?** Use o servidor local indicado na documentação. As APIs de câmera exigem um contexto seguro adequado, como `localhost` ou HTTPS.

**Por que um gesto muda quando me aproximo?** A classificação usa distâncias normalizadas entre pontos de referência e limiares fixos. A posição da câmera, a visibilidade da mão e a pose podem afetar o resultado; esse é um limite útil para testar, não uma evidência de um sistema de controle universal.

**Preciso compartilhar um vídeo da câmera para relatar um bug?** Não. Comece com as versões do navegador e do sistema operacional, a pose, as condições de iluminação, o estado esperado e o observado e, se possível, um teste com pontos de referência sintéticos.

<a id="repository-scope"></a>

## Escopo do repositório

Este repositório contém o código para o navegador, a lógica determinística de classificação de gestos, os testes e as verificações de qualidade. Binários locais, estado do editor, logs, pastas de dependências e páginas experimentais temporárias são intencionalmente excluídos.

<a id="help-improve-gestureos"></a>

## Ajude a melhorar o GestureOS

Contribuições pequenas e focadas são bem-vindas. Bons pontos de partida incluem casos-limite do classificador, erros de permissão de câmera mais claros, acessibilidade por teclado e documentação que ajude alguém a reproduzir uma interação.

1. Leia o mapa de módulos acima e escolha um comportamento para melhorar.
2. Para mudanças no classificador ou nas políticas, adicione um caso focado em `tests/run-tests.mjs`.
3. Execute `npm run check` e descreva quais verificações de navegador/câmera você realmente realizou.
4. Abra um pull request explicando o problema observado, a mudança e as limitações restantes.

| Primeira contribuição | Comece aqui | Inclua no PR |
| --- | --- | --- |
| Um caso-limite classificado incorretamente | `gesture-detector.js`, `tests/run-tests.mjs` | Pontos de referência sintéticos e o estado esperado; explique por que a regra deve mudar. |
| Uma falha de câmera mais clara | `gesture-policies.js`, `script.js` | A condição de falha, a mensagem esperada e um teste de regressão da política. |
| Instruções mais fáceis de usar | `index.html`, `README.md` | Uma interação ou etapa de configuração reproduzível; diferencie verificações em dispositivos reais de revisão estática. |

Para mudanças de renderização, mantenha a lógica de classificação testável de forma independente. Para mudanças de câmera, inclua, quando pertinente, os comportamentos de permissão negada, câmera indisponível e nova tentativa.

Para mudanças maiores de interação, abra primeiro uma [issue](https://github.com/son-gladyso/gestureos/issues) para discutir o escopo. Use entradas de teste sintéticas sempre que possível; não anexe gravações da câmera de outra pessoa sem permissão.
