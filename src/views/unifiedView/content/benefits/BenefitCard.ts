// src/views/unifiedView/content/benefits/BenefitCard.ts
import { Notice, TFile, setIcon } from "obsidian";
import { Benefit } from "../../../../types";
import { ComponentProps } from "../../types";
import { BenefitEditModal } from "../../../../modals/benefitModals/benefitEditModal";
import { FilterState } from "../../state/FilterState";

interface BenefitCardProps extends ComponentProps {
	benefits: Benefit[];
	filterState: FilterState;
	onRefresh: () => Promise<void>;
}

/**
 * Renders benefit cards
 */
export class BenefitCard {
	private props: BenefitCardProps;

	constructor(props: BenefitCardProps) {
		this.props = props;
	}

	/**
	 * Renders the benefit cards
	 */
	public render(container: HTMLElement): void {
		this.props.benefits.forEach((benefit) => {
			this.renderBenefitCard(container, benefit);
		});
	}

	/**
	 * Renders a single benefit card
	 */
	private renderBenefitCard(container: HTMLElement, benefit: Benefit): void {
		const card = container.createEl("div", { cls: "alrawi-benefit-card" });

		// Header with category and source type
		const cardHeader = card.createEl("div", {
			cls: "alrawi-benefit-card-header",
		});

		const category = cardHeader.createEl("div", {
			cls: "alrawi-benefit-category",
			text: benefit.category,
		});

		const sourceType = cardHeader.createEl("div", {
			cls: `alrawi-benefit-source-type alrawi-source-${benefit.sourceType}`,
			text: benefit.sourceType === "book" ? "كتاب" : "فيديو",
		});

		// Content section
		const cardContent = card.createEl("div", {
			cls: "alrawi-benefit-content",
		});

		// Display title if available
		if (benefit.title) {
			cardContent.createEl("h3", {
				cls: "alrawi-benefit-title",
				text: benefit.title,
			});
		}

		// Benefit text
		cardContent.createEl("div", {
			cls: "alrawi-benefit-text",
			text: benefit.text,
		});

		// For books, show pages and volume if available
		if (benefit.sourceType === "book") {
			const bookDetails = card.createEl("div", {
				cls: "alrawi-benefit-book-details",
			});

			if (benefit.pages) {
				bookDetails.createEl("div", {
					cls: "alrawi-benefit-pages",
					text: `الصفحات: ${benefit.pages}`,
				});
			}

			if (benefit.volume) {
				bookDetails.createEl("div", {
					cls: "alrawi-benefit-volume",
					text: `المجلد: ${benefit.volume}`,
				});
			}
		}

		// Source info
		const sourceInfo = card.createEl("div", {
			cls: "alrawi-benefit-source-info",
		});

		// Source title
		const sourceTitle = sourceInfo.createEl("div", {
			cls: "alrawi-benefit-source-title",
			text: benefit.sourceTitle,
		});

		// Add count badge to show number of benefits in this source
		this.props.dataService
			.countBenefits(benefit.sourcePath)
			.then((count) => {
				if (count > 1) {
					sourceTitle.createEl("span", {
						cls: "alrawi-benefit-source-count",
						text: ` (${count} فائدة)`,
					});
				}
			});

		// Click to open source
		sourceTitle.addEventListener("click", () => {
			this.openFile(benefit.sourcePath);
		});

		// Footer section
		const cardFooter = card.createEl("div", {
			cls: "alrawi-benefit-card-footer",
		});

		// Date added
		cardFooter.createEl("div", {
			cls: "alrawi-benefit-date",
			text: `أضيفت: ${benefit.dateAdded}`,
		});

		// Tags
		if (benefit.tags && benefit.tags.length > 0) {
			const tagsContainer = cardFooter.createEl("div", {
				cls: "alrawi-benefit-tags",
			});

			benefit.tags.forEach((tag) => {
				const tagChip = tagsContainer.createEl("span", {
					cls: "alrawi-tag-chip",
					text: tag,
				});

				// Clicking on a tag will add it as a filter
				tagChip.addEventListener("click", () => {
					const benefitFilterState =
						this.props.filterState.getBenefitsState();
					if (!benefitFilterState.tags.includes(tag)) {
						benefitFilterState.tags.push(tag);
						this.props.filterState.updateBenefitsState({
							tags: benefitFilterState.tags,
							page: 1,
						});
						this.props.onRefresh();
					}
				});
			});
		}

		// Action buttons
		const actionsContainer = card.createEl("div", {
			cls: "alrawi-benefit-actions",
		});

		// Button to open source file
		const openSourceBtn = actionsContainer.createEl("button", {
			cls: "alrawi-benefit-action-btn",
			attr: { title: "فتح المصدر" },
		});
		setIcon(openSourceBtn, "file-text");
		openSourceBtn.addEventListener("click", () => {
			this.openFile(benefit.sourcePath);
		});

		// Button to share benefit
		const shareBtn = actionsContainer.createEl("button", {
			cls: "alrawi-benefit-action-btn",
			attr: { title: "مشاركة" },
		});
		setIcon(shareBtn, "share-2");
		shareBtn.addEventListener("click", () => {
			this.shareBenefit(benefit);
		});

		// Edit button
		const editBtn = actionsContainer.createEl("button", {
			cls: "alrawi-benefit-action-btn",
			attr: { title: "تعديل الفائدة" },
		});
		setIcon(editBtn, "edit-2");
		editBtn.addEventListener("click", () => {
			this.editBenefit(benefit);
		});
	}

	/**
	 * Opens a file in Obsidian
	 */
	private openFile(filePath: string): void {
		const file = this.props.app.vault.getAbstractFileByPath(filePath);
		if (file instanceof TFile) {
			this.props.app.workspace.getLeaf().openFile(file);
		}
	}

	/**
	 * Shares a benefit (copies to clipboard)
	 */
	private shareBenefit(benefit: Benefit): void {
		// Create share text
		let shareText = "";

		// Add title if available
		if (benefit.title) {
			shareText += `${benefit.title}\n\n`;
		}

		// Add benefit text
		shareText += `${benefit.text}\n\n`;

		// Add book-specific fields if available
		if (benefit.sourceType === "book") {
			if (benefit.pages) {
				shareText += `الصفحات: ${benefit.pages}\n`;
			}

			if (benefit.volume) {
				shareText += `المجلد: ${benefit.volume}\n`;
			}
		}

		// Add source information
		shareText += `المصدر: ${benefit.sourceTitle} (${
			benefit.sourceType === "book" ? "كتاب" : "فيديو"
		})\n`;
		shareText += `التصنيف: ${benefit.category}\n`;

		if (benefit.tags && benefit.tags.length > 0) {
			shareText += `الوسوم: ${benefit.tags.join(", ")}\n`;
		}

		// Copy to clipboard
		navigator.clipboard
			.writeText(shareText)
			.then(() => {
				new Notice("✅ تم نسخ الفائدة إلى الحافظة");
			})
			.catch((err) => {
				console.error("Error copying to clipboard:", err);
				new Notice("❌ فشل نسخ الفائدة");
			});
	}

	/**
	 * Edits a benefit
	 */
	private editBenefit(benefit: Benefit): void {
		const file = this.props.app.vault.getAbstractFileByPath(
			benefit.sourcePath
		);
		if (!(file instanceof TFile)) {
			new Notice("❌ لم يتم العثور على ملف المصدر");
			return;
		}

		// Open the benefit modal with the existing data and pass refresh callback directly
		const modal = new BenefitEditModal(
			this.props.app,
			this.props.settings,
			file,
			benefit.sourceType,
			benefit.sourceTitle,
			benefit,
			this.props.onRefresh // Pass the refresh callback directly to the modal
		);

		// No need to override onClose since we're passing the callback directly
		modal.open();
	}
}
