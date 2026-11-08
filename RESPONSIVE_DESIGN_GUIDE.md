# Guía de Responsive Design - Olympo

## 📱 Breakpoints Principales

```
Desktop:     > 1024px   (Computadoras/Televisores)
Tablet:      768px - 1024px
Mobile:      < 768px    (Celulares)
Pequeño:     < 480px    (Celulares antiguos)
```

---

## 🎯 Cambios Implementados

### 1. Layout Principal (LayoutPrincipal.jsx)
✅ Sidebar dinámico (drawer en mobile)
✅ Overlay para cerrar sidebar automáticamente
✅ Header responsivo
✅ Main content adaptable

### 2. Header (Header.jsx)
✅ Botón hamburguesa visible solo en mobile
✅ Padding dinámico según pantalla
✅ Título se ajusta automáticamente
✅ Avatar responsive

### 3. Sidebar (Sidebar.jsx)
✅ Drawer modal en mobile (se desliza desde la izquierda)
✅ Colapsado en tablet (solo iconos)
✅ Completo en desktop
✅ Se cierra automáticamente al seleccionar un item

### 4. Contexto (contexto_app.jsx)
✅ Estado de `sidebar_abierto`
✅ Función `toggle_sidebar()` para abrir/cerrar
✅ Función `cerrar_sidebar()` para cerrar automáticamente

---

## 🎨 Clases Utilitarias Responsivas

### Contenedores
```jsx
<div className="container">             {/* 100% con padding adaptable */}
<div className="container--sm">         {/* Max 800px */}
<div className="container--md">         {/* Max 1000px */}
<div className="container--lg">         {/* Max 1400px */}
```

### Grillas
```jsx
<div className="grid--2">  {/* 2 columnas que colapsan a 1 en mobile */}
<div className="grid--3">  {/* 3 columnas que colapsan a 1 en mobile */}
<div className="grid--4">  {/* 4 columnas que colapsan a 1 en mobile */}
```

### Flexbox
```jsx
<div className="flex">           {/* flex básico con gap */}
<div className="flex--col">      {/* flex column */}
<div className="flex--center">   {/* centrado */}
<div className="flex--between">  {/* space-between */}
<div className="flex--wrap">     {/* con wrap */}
<div className="flex--responsive"> {/* responde a pantalla */}
```

### Espaciamiento
```jsx
<div className="p-xl">  {/* padding adaptable: 32px/24px/12px */}
<div className="p-lg">  {/* padding: 24px */}
<div className="m-md">  {/* margin: 16px */}
```

### Tipografía
```jsx
<h1 className="text-h1">    {/* 32px → 24px → 20px */}
<h2 className="text-h2">    {/* 24px → 18px → 16px */}
<p className="text-body">    {/* 14px → 13px → 12px */}
<p className="text-sm">      {/* 12px → 11px → 10px */}
```

### Mostrar/Ocultar
```jsx
<div className="hidden-mobile">   {/* No se ve en mobile */}
<div className="hidden-tablet">   {/* No se ve en tablet */}
<div className="hidden-desktop">  {/* No se ve en desktop */}
```

### Componentes
```jsx
<div className="card">        {/* Tarjeta responsiva */}
<button className="btn">      {/* Botón que se expande en mobile */}
<img className="img-responsive"> {/* Imagen responsiva */}
```

---

## 📝 Ejemplo: Página Responsive

```jsx
import './utilidades_responsive.css';

export default function MiPagina() {
  return (
    <div className="container p-xl">
      <h1 className="text-h1">Mi Página</h1>
      
      <div className="grid--3 m-lg">
        <div className="card">
          <h3 className="text-h3">Card 1</h3>
          <p className="text-body">Contenido...</p>
        </div>
        <div className="card">
          <h3 className="text-h3">Card 2</h3>
          <p className="text-body">Contenido...</p>
        </div>
        <div className="card">
          <h3 className="text-h3">Card 3</h3>
          <p className="text-body">Contenido...</p>
        </div>
      </div>

      <div className="form-row m-lg">
        <div className="form-group">
          <label>Nombre</label>
          <input type="text" placeholder="Ingresa tu nombre" />
        </div>
        <div className="form-group">
          <label>Email</label>
          <input type="email" placeholder="tu@email.com" />
        </div>
      </div>

      <div className="flex--between m-lg">
        <button className="btn">Cancelar</button>
        <button className="btn">Guardar</button>
      </div>
    </div>
  );
}
```

---

## 🔧 Media Queries Personalizadas

Si necesitas crear estilos personalizados:

```css
/* Desktop */
.mi-elemento {
  width: 400px;
  padding: 20px;
}

/* Tablet */
@media (max-width: 1024px) {
  .mi-elemento {
    width: 300px;
    padding: 16px;
  }
}

/* Tablet pequeño */
@media (max-width: 768px) {
  .mi-elemento {
    width: 100%;
    padding: 12px;
  }
}

/* Mobile */
@media (max-width: 480px) {
  .mi-elemento {
    padding: 8px;
  }
}
```

---

## ✅ Checklist para Hacer Responsiva una Página

- [ ] Importar `utilidades_responsive.css`
- [ ] Usar `.container` o `.container--*` para envolver contenido
- [ ] Usar `.grid--*` para grillas
- [ ] Usar `.flex--*` para layouts flexibles
- [ ] Usar clases de `text-*` para tipografía
- [ ] Usar `.hidden-*` para elementos que no se ven en ciertas pantallas
- [ ] Probar en mobile (< 480px)
- [ ] Probar en tablet (768px)
- [ ] Probar en desktop (> 1024px)
- [ ] Verificar que no haya scroll horizontal
- [ ] Verificar que todo sea clickeable en touch

---

## 🚀 Próximos Pasos

1. **Actualizar todas las páginas** para usar las utilidades responsivas
2. **Revisar PaginaDashboard.css** - Hacer las grillas responsive
3. **Revisar PaginaProyectos.css** - Hacer las tarjetas responsive
4. **Revisar PaginaMensajes.css** - Hacer los chats responsive
5. **Agregar máximo ancho** para pantallas muy grandes (TV)

---

## 📊 Variables CSS Disponibles

```css
--padding-page: 32px;  /* 24px en tablet, 12px en mobile */
--gap-grid: 24px;      /* 16px en tablet, 12px en mobile */
--gap-card: 16px;      /* Distancia entre items */
```

Úsalas en tus componentes:
```css
.mi-componente {
  padding: var(--padding-page);
  gap: var(--gap-grid);
}
```

---

## 🐛 Solución de Problemas

### El sidebar no cierra en mobile
- Verifica que `cerrar_sidebar()` se está llamando al hacer click en items
- Verifica que el overlay está presente en el JSX

### El header no es responsivo
- Verifica que el media query esté en Header.css
- Limpia la caché del navegador (Ctrl+Shift+Delete)

### Las imágenes no se adaptan
- Usa `className="img-responsive"` en las imágenes
- O usa CSS: `max-width: 100%; height: auto;`

### Texto muy pequeño en mobile
- Usa las clases `text-*` que escalan automáticamente
- O usa `font-size: clamp(12px, 5vw, 16px);`

---

## 📞 Soporte

Para consultas sobre responsive design, revisa:
1. [MDN - Responsive Design](https://developer.mozilla.org/es/docs/Learn/CSS/CSS_layout/Responsive_Design)
2. [CSS Media Queries](https://developer.mozilla.org/es/docs/Web/CSS/Media_Queries)
3. Los archivos CSS en la carpeta `components/layout/`
