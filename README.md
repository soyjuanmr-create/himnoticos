# Los Himnóticos · web

Home de la banda con formulario de contratación. Sitio estático: HTML, CSS y JavaScript sin dependencias ni proceso de build.

## Estructura

```
index.html            contenido de la home
legal.html            aviso legal, política de privacidad y cookies
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

## Pendiente antes de publicar

Estas piezas están montadas pero necesitan un dato que solo tiene la banda.

### 1. Formulario

El formulario envía a [Formspree](https://formspree.io). Hay que crear un formulario allí con el correo donde se quieren recibir las solicitudes y pegar su identificador en el atributo `action` del `<form id="booking">` de `index.html`, sustituyendo `REEMPLAZAR`:

```html
<form ... action="https://formspree.io/f/abcdwxyz" method="POST">
```

Mientras siga el valor `REEMPLAZAR`, el formulario avisa de que todavía no está conectado y no envía nada.

### 2. WhatsApp

El botón «Escríbenos por WhatsApp» está en la sección de contratación, oculto. Para activarlo, en `index.html`, dentro de `<p class="contact__fast" hidden>`:

- cambiar `34000000000` por el número real (prefijo 34, sin `+` ni espacios);
- quitar el atributo `hidden`.

Y en `legal.html`, dejar las frases sobre WhatsApp que ahora están marcadas entre corchetes.

### 3. Textos legales

`legal.html` es un borrador. Lo que falta está resaltado entre corchetes: titular, NIF, domicilio, correo, fecha y dos puntos que debe revisar alguien con criterio legal (jurisdicción y garantías de la transferencia internacional de Formspree). Al completarlo, quitar la línea `<meta name="robots" content="noindex">`.

### 4. Dossier para promotores

El bloque «¿Programas un festival o una sala?» está al final de la sección de bolos, oculto. Para activarlo:

- subir el PDF a `assets/docs/dossier-los-himnoticos.pdf` (con ese nombre exacto);
- en `index.html`, quitar el atributo `hidden` de `<aside class="dossier" hidden>`.

### 5. Dominio

Al tener la dirección definitiva, en el `<head>` de `index.html`:

- poner la URL absoluta de la imagen en `og:image` (por ejemplo `https://dominio.com/assets/img/og.jpg`); con una ruta relativa, WhatsApp e Instagram no muestran la imagen al compartir el enlace;
- añadir `<meta property="og:url" content="https://dominio.com/">`.

## Publicar

Pensado para GitHub Pages: en el repositorio, *Settings → Pages → Deploy from a branch → main / (root)*. En el plan gratuito de GitHub el repositorio tiene que ser público.

## Vídeos

Las tarjetas de «En directo» abren el reproductor oficial de Instagram en una ventana sobre la página. El contenido de Instagram solo se carga al pulsar reproducir; antes no se hace ninguna petición a sus servidores, y por eso la web no necesita aviso de cookies. Sin JavaScript, cada tarjeta es un enlace normal al vídeo.

Para cambiar un vídeo: en `index.html`, sustituir el identificador del reel (en `href` y en `data-reel`) y su portada en `assets/img/videos/`.

## Accesibilidad y movimiento

Con la opción del sistema «reducir movimiento» activada, la web se muestra sin intro, sin rayos y con el fondo estático.
