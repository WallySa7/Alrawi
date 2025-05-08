// src/core/settings/defaults.ts
import { AlRawiSettings, TableColumnConfig } from './types';

/**
 * Default table columns for videos
 */
export const DEFAULT_VIDEO_COLUMNS: TableColumnConfig[] = [
    { id: 'checkbox', enabled: true, order: 0, label: '' },
    { id: 'title', enabled: true, order: 1, label: 'العنوان', sortKey: 'title' },
    { id: 'presenter', enabled: true, order: 2, label: 'الملقي', sortKey: 'presenter' },
    { id: 'type', enabled: true, order: 3, label: 'النوع', sortKey: 'type' },
    { id: 'status', enabled: true, order: 4, label: 'الحالة', sortKey: 'status' },
    { id: 'duration', enabled: true, order: 5, label: 'المدة', sortKey: 'duration' },
    { id: 'tags', enabled: false, order: 6, label: 'الوسوم' },
    { id: 'categories', enabled: false, order: 7, label: 'التصنيفات' },
    { id: 'dateAdded', enabled: true, order: 8, label: 'تاريخ الإضافة', sortKey: 'dateAdded' },
    { id: 'actions', enabled: true, order: 9, label: 'إجراءات' }
];

/**
 * Default table columns for books
 */
export const DEFAULT_BOOK_COLUMNS: TableColumnConfig[] = [
    { id: 'checkbox', enabled: true, order: 0, label: '' },
    { id: 'title', enabled: true, order: 1, label: 'العنوان', sortKey: 'title' },
    { id: 'author', enabled: true, order: 2, label: 'المؤلف', sortKey: 'author' },
    { id: 'status', enabled: true, order: 3, label: 'الحالة', sortKey: 'status' },
    { id: 'pages', enabled: true, order: 4, label: 'الصفحات', sortKey: 'pages' },
    { id: 'pagesRead', enabled: true, order: 5, label: 'المقروء', sortKey: 'pagesRead' },
    { id: 'rating', enabled: false, order: 6, label: 'التقييم', sortKey: 'rating' },
    
    // Additional book properties - default to disabled but available
    { id: 'isbn', enabled: false, order: 7, label: 'الرقم المعياري ISBN', sortKey: 'isbn' },
    { id: 'publisher', enabled: false, order: 8, label: 'دار النشر', sortKey: 'publisher' },
    { id: 'publishYear', enabled: false, order: 9, label: 'سنة النشر', sortKey: 'publishYear' },
    { id: 'startDate', enabled: false, order: 10, label: 'تاريخ البدء', sortKey: 'startDate' },
    { id: 'completionDate', enabled: false, order: 11, label: 'تاريخ الانتهاء', sortKey: 'completionDate' },
    { id: 'language', enabled: false, order: 12, label: 'اللغة', sortKey: 'language' },
    { id: 'categories', enabled: false, order: 13, label: 'التصنيفات' },
    { id: 'tags', enabled: false, order: 14, label: 'الوسوم' },

    { id: 'dateAdded', enabled: true, order: 15, label: 'تاريخ الإضافة', sortKey: 'dateAdded' },
    { id: 'actions', enabled: true, order: 16, label: 'إجراءات' }
];

/**
 * Default video template
 */
export const DEFAULT_VIDEO_TEMPLATE = `---
النوع: {{type}}
الملقي: {{presenter}}
المدة: {{duration}}
تاريخ الإضافة: {{date}}
رابط: {{url}}
معرف الفيديو: {{videoId}}
الوسوم: {{tags}}
الصورة المصغرة: {{thumbnailUrl}}
التصنيفات: {{categories}}
الحالة: {{status}}
---

# {{title}}


{{description}}

## تفاصيل الفيديو
- **المدة:** {{duration}}
- **النوع:** {{type}}
- **الملقي:** {{presenter}}
- **الحالة:** {{status}}

[مشاهدة على اليوتيوب]({{url}})`;

/**
 * Default playlist template
 */
export const DEFAULT_PLAYLIST_TEMPLATE = `---
title: "{{title}}"
رابط السلسلة: "{{url}}"
معرف السلسلة: "{{playlistId}}"
الملقي: "{{presenter}}"
النوع: "{{type}}"
عدد المقاطع: {{itemCount}}
المدة الإجمالية: "{{duration}}"
الحالة: "{{status}}"
تاريخ الإضافة: "{{dateAdded}}"
التصنيفات: {{categories}}
الصورة المصغرة: "{{thumbnailUrl}}"
الوسوم: {{tags}}
---

# {{title}}

- **الملقي**: {{presenter}}
- **عدد المقاطع**: {{itemCount}}
- **المدة الإجمالية**: {{duration}}
- **الحالة**: {{status}}
- **تاريخ الإضافة**: {{date}}


## الرابط
[مشاهدة السلسلة على اليوتيوب]({{url}})

## الفوائد`;


/**
 * Default book template
 */
export const DEFAULT_BOOK_TEMPLATE = `---
العنوان: {{title}}
المؤلف: {{author}}
الصفحات: {{pages}}
الصفحات المقروءة: {{pagesRead}}
النوع: {{type}}
الناشر: {{publisher}}
سنة النشر: {{publishYear}}
الرقم المعياري ISBN: {{isbn}}
تاريخ البدء: {{startDate}}
تاريخ الانتهاء: {{completionDate}}
اللغة: {{language}}
التقييم: {{rating}}
الحالة: {{status}}
التصنيفات: {{categories}}
الوسوم: {{tags}}
تاريخ الإضافة: {{date}}
صورة الغلاف: {{coverUrl}}
---

# {{title}}

{{#if showCovers}}
![صورة الغلاف]({{coverUrl}})
{{/if}}

## تفاصيل الكتاب
- **المؤلف:** {{author}}
- **عدد الصفحات:** {{pages}}
- **الصفحات المقروءة:** {{pagesRead}}
- **الناشر:** {{publisher}}
- **سنة النشر:** {{publishYear}}
- **الحالة:** {{status}}
- **اللغة:** {{language}}
- **التقييم:** {{rating}}/5
- **تاريخ البدء:** {{startDate}}
- **تاريخ الانتهاء:** {{completionDate}}

## التصنيفات
{{categories}}

## ملاحظات
{{notes}}
`;

/**
 * Default settings for Al-Rawi plugin
 */
export const DEFAULT_SETTINGS: AlRawiSettings = {
    youtubeApiKey: '',
    defaultFolder: 'Al-Rawi Videos',
    defaultPresenter: 'غير معروف',
    dateFormat: 'YYYY-MM-DD',
    showThumbnailsInStats: true,
    maxTitleLength: 100,
    tableColumns: {
        videos: DEFAULT_VIDEO_COLUMNS,
        books: DEFAULT_BOOK_COLUMNS
    },
    progressTracking: {
        defaultStatus: 'لم يشاهد',
        statusOptions: ['في قائمة الانتظار', 'تمت المشاهدة', 'قيد المشاهدة', 'لم يشاهد']
    },
    templates: {
        video: DEFAULT_VIDEO_TEMPLATE,
        playlist: DEFAULT_PLAYLIST_TEMPLATE,
        book: DEFAULT_BOOK_TEMPLATE
    },
    folderRules: {
        enabled: true,
        structure: "{{type}}/{{presenter}}",
        defaultStructure: "{{type}}/{{presenter}}",
        showExamples: true
    },
    viewMode: 'table',
    booksSettings: {
        defaultFolder: 'Al-Rawi Books',
        defaultAuthor: 'غير معروف',
        showCovers: true,
        readingGoal: {
            enabled: true,
            booksPerYear: 24,
            pagesPerDay: 20
        },
        bookStatusOptions: ['في قائمة الانتظار', 'تمت القراءة', 'قيد القراءة', 'لم يقرأ'],
        defaultStatus: 'لم يقرأ',
        folderStructure: "{{author}}/{{categories}}"
    }
};