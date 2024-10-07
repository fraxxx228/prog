// Импортируем необходимые модули из gulp
const { src, dest, watch, parallel, series } = require('gulp');
const scss = require('gulp-sass')(require('sass')); // Для компиляции SCSS в CSS
const concat = require('gulp-concat'); // Для объединения файлов
const uglify = require('gulp-uglify-es').default; // Для минимизации JavaScript
const browserSync = require('browser-sync').create(); // Для обновления браузера в реальном времени
const clean = require('gulp-clean'); // Для очистки папки dist
const avif = require('gulp-avif');
const webp = require('gulp-webp');
const imagemin = require('gulp-imagemin');
const newer = require('gulp-newer');
const fonter = require('gulp-fonter');
const include = require('gulp-include');
const svgSprite = require('gulp-svg-sprite');

function pages(){
    return src('app/pages/*.html')
    .pipe(include({
        includePaths : 'app/components'
    }))
    .pipe(dest('app'))
    .pipe(browserSync.stream()); // Обновляем браузер при изменении скриптов

}
async function fonts() {
    // Динамически импортируем модуль ttf2woff2
    const { default: ttf2woff2 } = await import('gulp-ttf2woff2');

    return src('app/fonts/src/*.*')
        .pipe(fonter({
            formats: ['woff', 'ttf']
        }))
        .pipe(ttf2woff2())
        .pipe(dest('app/fonts'));
}
function images() {
    return src(['app/images/src/*.*', '!app/images/src/*.svg'], {encoding: false})
    .pipe(newer('app/images/dist'))
      .pipe(avif({quality:50}))
      .pipe(src('app/images/src/*.*'))
    .pipe(newer('app/images/dist'))
      .pipe(webp())
      .pipe(src('app/images/src/*.*'))
    .pipe(newer('app/images/dist'))
      .pipe(imagemin())
      .pipe(dest('app/images/dist'))
  }

function sprite (){
    return src('app/images/dist/*.svg')
    .pipe(svgSprite({
        mode :{
            stack: {
                sprite: '../sprite.svg',
                example: true
            }
        }
    }))
    .pipe(dest('app/images/dist'))
}
// Асинхронная функция для обработки стилей (SCSS -> CSS)
async function styles() {
    const autoprefixer = (await import('gulp-autoprefixer')).default;
    return src('app/scss/style.scss') // Указываем основной файл стилей
        .pipe(scss({ outputStyle: 'compressed' }).on('error', scss.logError)) // Компилируем SCSS
        .pipe(autoprefixer({ // Добавляем вендорные префиксы
            overrideBrowserslist: ['last 10 versions'],
            cascade: false
        }))
        .pipe(concat('style.min.css')) // Объединяем в один файл
        .pipe(dest('app/css')) // Сохраняем скомпилированный файл
        .pipe(browserSync.stream()); // Обновляем браузер
}

// Функция для обработки скриптов
function scripts() {
    return src([
            'node_modules/swiper/swiper-bundle.js', // Включаем библиотеку Swiper
            'app/js/main.js' // Включаем основной файл JavaScript
    ])
        .pipe(concat('main.min.js')) // Объединяем в один файл main.min.js
        .pipe(uglify()) // Минимизируем JavaScript
        .pipe(dest('app/js')) // Сохраняем в папку app/js
        .pipe(browserSync.stream()); // Обновляем браузер при изменении скриптов
}

// Функция для отслеживания изменений в файлах
function watching() {
    browserSync.init({
        server: {
            baseDir: "app/" // Указываем корневую папку для сервера
        }
    });
    watch(['app/scss/style.scss'], styles); // Отслеживаем изменения в SCSS и запускаем styles
    watch(['app/images/src'], images); 
    watch(['app/components/*', 'app/pages/*'], pages); 
    watch(['app/js/main.js'], scripts); // Отслеживаем изменения в скриптах и запускаем scripts
    watch(['app/**/*.html']).on('change', browserSync.reload); // Перезагружаем браузер при изменении HTML
}

// Функция для настройки локального сервера и автоматической перезагрузки страницы


// Функция для очистки папки dist перед сборкой
function cleandist() {
    return src('dist', { allowEmpty: true }) // Указываем папку dist
        .pipe(clean()); // Очищаем её
}

// Функция для копирования файлов в папку dist при сборке проекта
function building() {
    return src([
        'app/css/style.min.css', // Берём минифицированные стили
        'app/js/main.min.js',
        '!app/images/dist/*.svg',
        'app/images/dist/sprite.svg',
        'app/images/dist/*.*', // Берём минифицированные скрипты
        'app/fonts/*.*',
        'app/**/*.html' // Берём все HTML файлы
    ], { base: 'app' }) // Сохраняем структуру папок
        .pipe(dest('dist')); // Копируем в папку dist
}


exports.images = images;
exports.fonts = fonts;
exports.pages = pages;
// Экспортируем функции для использования в командной строке
exports.styles = styles; // Компиляция стилей
exports.scripts = scripts; // Обработка скриптов
exports.watching = watching; // Отслеживание изменений
exports.sprite = sprite;
exports.building = building;

// Экспорт задачи сборки: сначала очистка dist, затем копирование файлов
exports.build = series(cleandist, building);

// Экспорт по умолчанию: параллельный запуск всех задач
exports.default = parallel(pages, styles,images, scripts, watching);
