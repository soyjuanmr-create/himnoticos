# Los Himnóticos · web

Home de la banda con formulario de contratación. Sitio estático: HTML, CSS y JavaScript sin dependencias ni proceso de build.

## Estructura

```
index.html            contenido de la home
css/styles.css        estilos
js/main.js            animaciones e interacciones
assets/fonts/         tipografías autoalojadas (Archivo y Pirata One, licencia SIL OFL)
assets/img/           favicon
```

## Verla en local

```bash
python3 -m http.server 8000
```

Y abrir `http://localhost:8000`.

## Conectar el formulario

El formulario envía a [Formspree](https://formspree.io). Hay que crear un formulario allí con el email donde se quieren recibir las solicitudes y pegar su identificador en el atributo `action` del `<form id="booking">` de `index.html`, sustituyendo `REEMPLAZAR`:

```html
<form ... action="https://formspree.io/f/abcdwxyz" method="POST">
```

Mientras siga el valor `REEMPLAZAR`, el formulario avisa de que todavía no está conectado y no envía nada.

## Publicar

Pensado para GitHub Pages: en el repositorio, *Settings → Pages → Deploy from a branch → main / (root)*.

## Accesibilidad y movimiento

Con la opción del sistema «reducir movimiento» activada, la web se muestra sin intro, sin rayos y con el fondo estático.
