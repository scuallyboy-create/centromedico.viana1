# Viana I — GitHub / Vercel

## 1. Suspender o site inteiro
Em `site-status.js`:

```js
window.SITE_ATIVO = false;
```

Todos os acessos a `index.html` e aos QR Codes de `employee.html?id=...` serão enviados para `suspenso.html`.

## 2. Reactivar o site
Altere para:

```js
window.SITE_ATIVO = true;
```

Faça commit/push. O Vercel fará o novo deployment.

## 3. Suspender apenas um funcionário
No `team-data.js`, encontre o funcionário pelo `id` e altere:

```js
"status": "ready"
```

para:

```js
"status": "suspended"
```

Não apague o funcionário e não altere o `id`. O QR Code existente continuará a abrir `employee.html?id=XXX`, que mostrará:

**Funcionário suspenso**

## 4. Para voltar a activar o perfil
Altere novamente:

```js
"status": "ready"
```

## 5. Estrutura mínima

- index.html
- employee.html
- suspenso.html
- site-status.js
- team-data.js
- style.css
- script.js
- fundo.jpg
- assets/

`fundo.jpg` deve ficar na mesma pasta de `suspenso.html`.
