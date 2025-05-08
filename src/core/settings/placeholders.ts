// src/core/settings/placeholders.ts
import { PlaceholderDoc } from './types';

/**
 * Placeholder documentation for video templates
 */
export const VIDEO_PLACEHOLDERS: PlaceholderDoc[] = [
    { placeholder: '{{type}}', description: 'نوع المحتوى (مقطع/السلسلة)' },
    { placeholder: '{{presenter}}', description: 'اسم الملقي' },
    { placeholder: '{{duration}}', description: 'مدة الفيديو (HH:MM:SS)' },
    { placeholder: '{{date}}', description: 'تاريخ الإضافة' },
    { placeholder: '{{url}}', description: 'رابط اليوتيوب' },
    { placeholder: '{{videoId}}', description: 'معرف الفيديو' },
    { placeholder: '{{tags}}', description: 'قائمة الوسوم' },
    { placeholder: '{{thumbnailUrl}}', description: 'رابط الصورة المصغرة' },
    { placeholder: '{{title}}', description: 'عنوان الفيديو' },
    { placeholder: '{{description}}', description: 'وصف الفيديو' },
];

/**
 * Placeholder documentation for playlist templates
 */
export const PLAYLIST_PLACEHOLDERS: PlaceholderDoc[] = [
    { placeholder: '{{type}}', description: 'نوع المحتوى (السلسلة)' },
    { placeholder: '{{presenter}}', description: 'اسم الملقي' },
    { placeholder: '{{itemCount}}', description: 'عدد المقاطع في السلسلة' },
    { placeholder: '{{duration}}', description: 'المدة الإجمالية (HH:MM:SS)' },
    { placeholder: '{{url}}', description: 'رابط السلسلة' },
    { placeholder: '{{playlistId}}', description: 'معرف السلسلة' },
    { placeholder: '{{date}}', description: 'تاريخ الإضافة' },
    { placeholder: '{{title}}', description: 'عنوان السلسلة' }
];

/**
 * Placeholder documentation for book templates
 */
export const BOOK_PLACEHOLDERS: PlaceholderDoc[] = [
    { placeholder: '{{title}}', description: 'عنوان الكتاب' },
    { placeholder: '{{author}}', description: 'اسم المؤلف' },
    { placeholder: '{{pages}}', description: 'عدد صفحات الكتاب' },
    { placeholder: '{{pagesRead}}', description: 'عدد الصفحات المقروءة' },
    { placeholder: '{{type}}', description: 'نوع المحتوى (كتاب)' },
    { placeholder: '{{publisher}}', description: 'دار النشر' },
    { placeholder: '{{publishYear}}', description: 'سنة النشر' },
    { placeholder: '{{isbn}}', description: 'الرقم المعياري للكتاب ISBN' },
    { placeholder: '{{startDate}}', description: 'تاريخ بدء القراءة' },
    { placeholder: '{{completionDate}}', description: 'تاريخ انتهاء القراءة' },
    { placeholder: '{{language}}', description: 'لغة الكتاب' },
    { placeholder: '{{rating}}', description: 'تقييم الكتاب (من 1 إلى 5)' },
    { placeholder: '{{status}}', description: 'حالة القراءة' },
    { placeholder: '{{categories}}', description: 'تصنيفات الكتاب' },
    { placeholder: '{{tags}}', description: 'الوسوم' },
    { placeholder: '{{date}}', description: 'تاريخ إضافة الكتاب' },
    { placeholder: '{{coverUrl}}', description: 'رابط صورة غلاف الكتاب' },
    { placeholder: '{{notes}}', description: 'ملاحظات حول الكتاب' },
    { placeholder: '{{showCovers}}', description: 'عرض صورة الغلاف (يستخدم مع {{#if}})' }
];

/**
 * Placeholder documentation for folder structure
 */
export const FOLDER_PLACEHOLDERS: PlaceholderDoc[] = [
    { placeholder: '{{type}}', description: 'نوع المحتوى (مقطع/السلسلة)' },
    { placeholder: '{{presenter}}', description: 'اسم الملقي' },
    { placeholder: '{{date}}', description: 'تاريخ الإضافة (YYYY-MM-DD)' },
    { placeholder: '{{year}}', description: 'السنة فقط' },
    { placeholder: '{{month}}', description: 'الشهر فقط' },
    { placeholder: '{{day}}', description: 'اليوم فقط' }
];

/**
 * Mapping of template types to their placeholder documentation
 */
export const PLACEHOLDER_DOCS: Record<string, PlaceholderDoc[]> = {
    video: VIDEO_PLACEHOLDERS,
    playlist: PLAYLIST_PLACEHOLDERS,
    book: BOOK_PLACEHOLDERS
};

/**
 * Gets a folder structure example based on the pattern
 * @param structure Folder structure pattern
 * @returns Example based on the pattern
 */
export function getFolderExample(structure: string): string {
    const examples: Record<string, string> = {
        "{{type}}/{{presenter}}": "مقطع/ابن عثيمين",
        "{{presenter}}/{{type}}": "ابن عثيمين/سلسلة",
        "{{type}}/{{year}}": "سلسلة/2023",
        "{{presenter}}/{{year}}-{{month}}": "ابن باز/2023-07",
        "{{type}}/{{presenter}}/{{date}}": "مقطع/ابن عثيمين/2023-07-15"
    };
    
    return examples[structure] || examples["{{type}}/{{presenter}}"];
}