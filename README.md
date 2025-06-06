# vanilla-sonner

A lightweight port of [Sonner](https://github.com/emilkowalski/sonner) for vanilla JavaScript.

vanilla-sonner brings elegant and customizable toast notifications to your web applications without any framework dependencies.

## ✨ Features

Framework Agnostic: Works with any vanilla JavaScript project.

Highly Customizable: Control position, theme, duration, and content (plain, description, success, info, warning, error).

Rich Colors: Option to use rich, type-specific colors for enhanced visual feedback.

Interactive: Toasts expand on hover for better readability and pause their removal.

## 🚀 Installation

### via npm

```bash
npm install vanilla-sonner
```

via CDN:

```html
<head>

    ...

    <link href="https://cdn.jsdelivr.net/npm/vanilla-sonner@1.0.0/dist/sonner.min.css" rel="stylesheet" />

    <script src="https://cdn.jsdelivr.net/npm/vanilla-sonner@1.0.0/dist/sonner.umd.min.js" type="module"></script>

    <!-- If you're using ES Modules -->
    <script src="https://cdn.jsdelivr.net/npm/vanilla-sonner@1.0.0/dist/sonner.es.min.js" type="module"></script>

    
    ...

</head>
```

via Manually:

```html
<head>

    ...

    <link href="path/to/dist/sonner.min.css" rel="stylesheet" />

    <script src="path/to/dist/sonner.umd.min.js" type="module"></script>

    <!-- If you're using ES Modules -->
    <script src="path/to/dist/sonner.es.min.js" type="module"></script>

    
    ...

</head>
```

## 💻 Usage

To get started, you'll need to include the toaster container in your HTML and then use the toast function in your JavaScript.

### Add the Toaster Container

Place an `<ol>` element with the `id="sonner-toast-container"` in your index.html (or main application file). This element serves as the main container for all toasts and allows for global configuration via data attributes.

```html
<body>
    ...

    <!-- The main toaster container -->
    <ol id="sonner-toast-container"
        position="bottom-right"
        max-toasts="3"
        rich-colors="true"
        theme="light">
    </ol>

...
</body>
```

## Import and Use Toasts

After setting up your container, import the toast function into your JavaScript file and use it to display notifications. If you're including the script directly in your HTML, toast will be globally available on the window object.

```js
import { toast } from 'vanilla-sonner'; // If using ES Modules

// Basic toast
toast('My first vanilla toast!');

// Toast with a description
toast.message('Update available', 'New version 1.2.0 available for download.');

// Success toast
toast.success('Event created successfully!');

// Info toast
toast.info('5 tasks completed!');

// Warning toast
toast.warning('Please save your changes before closing!');

// Error toast
toast.error('Something went wrong!');

// Custom toast with specific options
toast.custom({
    type: 'plain',
    message: 'Hello from custom toast!',
    duration: 3000, // Overrides global duration for this toast
    theme: 'dark', // Overrides global theme for this toast
    closeButton: false, // Hides close button for this toast
    xPosition: 'left', // 'left', 'right', or 'center'
    yPosition: 'top', // 'top' or 'bottom'
});

```

## Toaster Container Attributes

Configure the global behavior of your toasts by adding the following attributes to the `<ol id="sonner-toast-container">` element:

| Attribute    | Description                                                                                                 | Default        | Accepted Values                                                                         |
|--------------|-------------------------------------------------------------------------------------------------------------|----------------|-----------------------------------------------------------------------------------------|
| position     | Sets the default position of the toasts.                                                                    | bottom-right   | bottom-right, top-left, top-center, top-right, bottom-left, bottom-center, bottom-right |
| max-toasts   | The maximum number of toasts to display at once. Older toasts will be hidden if this limit is exceeded.     | 3              | Any integer                                                                             |
| duration     | The default duration (in milliseconds) for which a toast remains visible. Set to 0 for indefinite duration. | 0 (indefinite) | Any integer (milliseconds)                                                              |
| close-button | If true, a close button will be displayed on each toast.                                                    | false          | true, false                                                                             |
| rich-colors  | If true, toasts will use type-specific background and border colors (success, info, warning, error).        | false          | true, false                                                                             |
| theme        | Sets the default theme for toasts .                                                                         | light          | light, dark                                                                             |
| expanded     | If true, toasts will appear in an expanded state by default.                                                | false          | true, false                                                                             |

## ToastOptions Interface

The ToastOptions interface defines the available properties when creating a toast:

```ts
interface ToastOptions {
    type: "plain" | "description" | "success" | "info" | "warning" | "error" | "action";
    message: string;
    theme?: "light" | "dark";
    description?: string;
    xPosition?: "left" | "right" | "center";
    yPosition?: "top" | "bottom";
    duration?: number; // In milliseconds
    useRichColors?: boolean;
    action?: { // Note: Action toasts are planned for future updates.
        label: string;
        onClick: () => void;
    };
    closeButton?: boolean;
}
```

## 🛠️ Development

To set up the project for development:

Clone the repository:

```bash
git clone https://github.com/devwaseem/vanilla-sonner.git
cd vanilla-sonner
```

Install dependencies:

```bash
npm install
```

Build the project:

```bash
npm run build
```

This generates the dist folder, containing the compiled JavaScript and CSS files.

## Run the example 

You can open example/index.html directly in your browser, or use a local development server. If you have vite installed, you can run:

```bash
vite dev # from the root directory
```

Then, navigate to [http://localhost:5173/example/index.html](http://localhost:5173/example/index.html) (port might vary).

## 📜 License

This project is licensed under the MIT License. See the [LICENSE](https://github.com/devwaseem/vanilla-sonner/blob/main/LICENSE) file for details.

## 🤝 Contributing

Contributions are welcome! If you find a bug or have a feature request, please open an issue. If you'd like to contribute code, please fork the repository and submit a pull request.
