# Los Himnóticos · web

Home de la banda con formulario de contratación. Sitio estático: HTML, CSS y JavaScript sin dependencias ni proceso de build.

## Estructura

```
index.html            contenido de la home
legal.html            aviso legal, política de privacidad y cookies
sitemap.xml           mapa del sitio para buscadores
css/styles.css        estilos
js/main.js            animaciones e interacciones
assets/fonts/         tipografías autoalojadas (Archivo y Pirata One, licencia SIL OFL)
assets/img/           favicon, imagen para compartir, fotos de la banda y portadas de los vídeos
assets/docs/          aquí va el dossier en PDF
```

## Verla en local

```bash
python3 -m http.server 8000
```

Y abrir `http://localhost:8000`.

## Publicar

Pensado para GitHub Pages. En el repositorio de GitHub:

1. *Settings → General → Danger Zone → Change repository visibility → Make public* (el plan gratuito solo publica repositorios públicos).
2. *Settings → Pages → Build and deployment → Source: Deploy from a branch → Branch: `main` / `(root)` → Save*.

En un par de minutos queda en `https://soyjuanmr-create.github.io/himnoticos/`.

## Formulario

El formulario envía a través de [FormSubmit](https://formsubmit.co), que reenvía cada solicitud a `himnoticos@gmail.com` sin necesidad de crear una cuenta.

**Activación (una sola vez):** con la web ya publicada, hay que enviar el formulario una primera vez. FormSubmit manda entonces a `himnoticos@gmail.com` un correo con un enlace «Activate Form»; al pulsarlo, el formulario queda activo. Hasta entonces, quien lo envíe verá un aviso de que está pendiente de activar.

Para enviar basta con el nombre, el tipo de evento y un correo o un teléfono; los avisos de error salen junto al campo que falla.

Ese mismo correo trae un código alternativo. Conviene sustituir con él la dirección en el atributo `action` del `<form id="booking">` de `index.html` (`https://formsubmit.co/CÓDIGO`), para que el correo no quede visible en el código de la página.

## Pendiente antes del lanzamiento definitivo

Lo siguiente está visible con datos de muestra, para ver cómo queda.

### 1. WhatsApp

El botón «Escríbenos por WhatsApp» de la sección de contratación apunta a `34000000000`, un número que no existe (a propósito, para que nadie acabe escribiendo a un desconocido). En `index.html`, dentro de `<p class="contact__fast">`, cambiarlo por el real: prefijo 34, sin `+` ni espacios.

### 2. Dossier para promotores

`assets/docs/dossier-los-himnoticos.pdf` es un documento de muestra, marcado como tal en todas sus páginas. Para poner el definitivo, sustituirlo por otro PDF con ese mismo nombre.

### 3. Textos legales

`legal.html` es un borrador. Lo que falta está resaltado entre corchetes: titular, NIF, domicilio, fecha y dos puntos que debe revisar alguien con criterio legal (jurisdicción y dónde trata los datos el servicio del formulario). Al completarlo, quitar de `legal.html` la línea `<meta name="robots" content="noindex">`.

### 4. Indexación en buscadores

`index.html` lleva también `<meta name="robots" content="noindex">` para que Google no indexe la web mientras tenga datos de muestra. Quitar esa línea al lanzar.

Después de quitarla, dar de alta la web en [Google Search Console](https://search.google.com/search-console) y enviar ahí la dirección de `sitemap.xml`. Poner el enlace de la web en la bio de Instagram también ayuda a que Google la encuentre.

### 5. Dominio propio

La dirección de GitHub Pages (`https://soyjuanmr-create.github.io/himnoticos/`) aparece en cuatro sitios. Si la web pasa a un dominio propio, cambiarla en todos:

- en el `<head>` de `index.html`: `canonical`, `og:url` y `og:image`;
- en el mismo `<head>`, dentro de los datos estructurados (`url`, `image` y `logo`);
- en `sitemap.xml`.

## Vídeos

Las tarjetas de «En directo» abren el reproductor oficial de Instagram en una ventana sobre la página. El contenido de Instagram solo se carga al pulsar reproducir; antes no se hace ninguna petición a sus servidores, y por eso la web no necesita aviso de cookies. Sin JavaScript, cada tarjeta es un enlace normal al vídeo.

Para cambiar un vídeo: en `index.html`, sustituir el identificador del reel (en `href` y en `data-reel`) y su portada en `assets/img/videos/`.

## Accesibilidad y movimiento

Con la opción del sistema «reducir movimiento» activada, la web se muestra sin intro, sin rayos y con el fondo estático.

La intro solo se ve en la primera carga de cada sesión del navegador; en las siguientes, la página entra directamente. El rótulo de escenarios se puede parar con su botón «Pausar» o, con ratón, dejando el puntero encima.
