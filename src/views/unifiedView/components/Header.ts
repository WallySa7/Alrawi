// src/views/unifiedView/components/Header.ts
import { setIcon, WorkspaceLeaf } from "obsidian";
import { CONTENT_TYPE, VIEW_MODE } from "../constants";
import { ContentType } from "../types";
import { ComponentProps } from "../types";
import { AlRawiModal } from "../../../modals/contentModals/videoModal";
import { BookModal } from "../../../modals/contentModals/bookModal";
import { ExportActions } from "../actions/ExportActions";
import { ImportActions } from "../actions/ImportActions";
import { SelectionState, SelectionStateEvents } from "../state/SelectionState";

/**
 * Props for the Header component
 */
interface HeaderProps extends ComponentProps {
	contentType: ContentType;
	onContentTypeChange: (type: ContentType) => void;
	onViewModeChange: (mode: "table" | "card") => void;
	onRefresh: () => Promise<void>;
	selectionState?: SelectionState;
	leaf: WorkspaceLeaf;
}

/**
 * Enhanced header component with optimized rendering
 */
export class Header {
	private props: HeaderProps;
	private exportActions: ExportActions;
	private importActions: ImportActions;
	private container: HTMLElement | null = null;
	private exportButton: HTMLButtonElement | null = null;
	private videosButton: HTMLButtonElement | null = null;
	private booksButton: HTMLButtonElement | null = null;
	private benefitsButton: HTMLButtonElement | null = null;
	private tableViewBtn: HTMLButtonElement | null = null;
	private cardViewBtn: HTMLButtonElement | null = null;
	private stateUnsubscribes: (() => void)[] = [];

	/**
	 * Creates a new Header component
	 * @param props - Component props
	 */
	constructor(props: HeaderProps) {
		this.props = props;
		this.exportActions = new ExportActions(
			props.app,
			props.plugin,
			props.dataService
		);
		this.importActions = new ImportActions(
			props.app,
			props.plugin,
			props.dataService
		);

		// Set up selection change listener if selection state is provided
		if (props.selectionState) {
			const unsubscribe = props.selectionState.subscribe(
				SelectionStateEvents.SELECTION_CHANGED,
				this.updateSelectionDependentUI.bind(this)
			);

			this.stateUnsubscribes.push(unsubscribe);
		}
	}

	/**
	 * Renders the header section with title and action buttons
	 * @param container - Container to render into
	 */
	public render(container: HTMLElement): void {
		this.container = container;

		const header = container.createEl("div", { cls: "alrawi-header" });

		// Add the title based on content type
		this.renderTitle(header);

		// Add action buttons
		this.renderActionBar(header);
	}

	/**
	 * Renders the header title
	 * @param container - Container to render into
	 */
	private renderTitle(container: HTMLElement): void {
		let headerTitle: string;
		if (this.props.contentType === CONTENT_TYPE.VIDEOS) {
			headerTitle = "📊 إحصائيات الراوي";
		} else if (this.props.contentType === CONTENT_TYPE.BOOKS) {
			headerTitle = "📚 مكتبة الراوي";
		} else {
			headerTitle = "📝 فوائد الراوي";
		}
		container.createEl("h2", { text: headerTitle });
	}

	/**
	 * Renders the action bar with buttons
	 * @param container - Container to render into
	 */
	private renderActionBar(container: HTMLElement): void {
		const actionBar = container.createEl("div", {
			cls: "alrawi-action-bar",
		});

		// Store reference in element
		(actionBar as any)._headerComponent = this;

		// Content type toggle
		this.renderContentTypeToggle(actionBar);

		// Add item button - not shown in benefits view
		if (this.props.contentType !== CONTENT_TYPE.BENEFITS) {
			this.renderAddButton(actionBar);
		}

		// Export button
		this.exportButton = this.renderExportButton(actionBar);

		// Import button - not shown in benefits view
		if (this.props.contentType !== CONTENT_TYPE.BENEFITS) {
			this.renderImportButton(actionBar);
		}

		// Refresh button
		this.renderRefreshButton(actionBar);

		// View toggle - not shown in benefits view
		if (this.props.contentType !== CONTENT_TYPE.BENEFITS) {
			this.renderViewToggle(actionBar);
		}
	}

	/**
	 * Renders the content type toggle (videos/books/benefits)
	 * @param container - Container to render into
	 */
	private renderContentTypeToggle(container: HTMLElement): void {
		const contentTypeToggle = container.createEl("div", {
			cls: "alrawi-content-type-toggle",
		});

		this.videosButton = contentTypeToggle.createEl("button", {
			cls: `alrawi-content-toggle ${
				this.props.contentType === CONTENT_TYPE.VIDEOS ? "active" : ""
			}`,
			text: "فيديوهات",
			attr: { title: "عرض الفيديوهات" },
		});
		setIcon(this.videosButton, "play-circle");
		this.videosButton.addEventListener("click", () =>
			this.props.onContentTypeChange(CONTENT_TYPE.VIDEOS)
		);

		this.booksButton = contentTypeToggle.createEl("button", {
			cls: `alrawi-content-toggle ${
				this.props.contentType === CONTENT_TYPE.BOOKS ? "active" : ""
			}`,
			text: "كتب",
			attr: { title: "عرض الكتب" },
		});
		setIcon(this.booksButton, "book");
		this.booksButton.addEventListener("click", () =>
			this.props.onContentTypeChange(CONTENT_TYPE.BOOKS)
		);

		this.benefitsButton = contentTypeToggle.createEl("button", {
			cls: `alrawi-content-toggle ${
				this.props.contentType === CONTENT_TYPE.BENEFITS ? "active" : ""
			}`,
			text: "فوائد",
			attr: { title: "عرض الفوائد" },
		});
		setIcon(this.benefitsButton, "calendar-check");
		this.benefitsButton.addEventListener("click", () =>
			this.props.onContentTypeChange(CONTENT_TYPE.BENEFITS)
		);
	}

	/**
	 * Renders the add button
	 * @param container - Container to render into
	 * @returns Created button element
	 */
	private renderAddButton(container: HTMLElement): HTMLButtonElement {
		const addButton = container.createEl("button", {
			cls: "alrawi-action-button",
			text:
				this.props.contentType === CONTENT_TYPE.VIDEOS
					? "إضافة فيديو"
					: "إضافة كتاب",
		});
		setIcon(addButton, "plus-circle");
		addButton.addEventListener("click", () => {
			if (this.props.contentType === CONTENT_TYPE.VIDEOS) {
				const modal = new AlRawiModal(
					this.props.app,
					this.props.settings
				);

				// Enable auto-refresh after modal is closed
				const originalOnClose = modal.onClose;
				modal.onClose = async () => {
					originalOnClose.call(modal);
					await this.props.onRefresh();
				};

				modal.open();
			} else {
				const modal = new BookModal(
					this.props.app,
					this.props.settings
				);

				// Enable auto-refresh after modal is closed
				const originalOnClose = modal.onClose;
				modal.onClose = async () => {
					originalOnClose.call(modal);
					await this.props.onRefresh();
				};

				modal.open();
			}
		});

		return addButton;
	}

	/**
	 * Renders the export button
	 * @param container - Container to render into
	 * @returns Created button element
	 */
	private renderExportButton(container: HTMLElement): HTMLButtonElement {
		const exportButton = container.createEl("button", {
			cls: "alrawi-action-button",
			text: "تصدير",
		});
		setIcon(exportButton, "download");
		exportButton.addEventListener("click", async () => {
			// Get selected items if available
			const selectedItems = this.props.selectionState
				? this.props.selectionState.getSelectedItems()
				: [];

			// Use updated export actions for all content types
			this.exportActions.showExportMenu(
				exportButton,
				this.props.contentType,
				selectedItems
			);
		});

		return exportButton;
	}

	/**
	 * Renders the import button
	 * @param container - Container to render into
	 * @returns Created button element
	 */
	private renderImportButton(container: HTMLElement): HTMLButtonElement {
		const importButton = container.createEl("button", {
			cls: "alrawi-action-button",
			text: "استيراد",
		});
		setIcon(importButton, "upload");
		importButton.addEventListener("click", () => {
			this.importActions.showImportDialog(
				this.props.contentType,
				this.props.onRefresh
			);
		});

		return importButton;
	}

	/**
	 * Renders the refresh button
	 * @param container - Container to render into
	 * @returns Created button element
	 */
	private renderRefreshButton(container: HTMLElement): HTMLButtonElement {
		const refreshButton = container.createEl("button", {
			cls: "alrawi-action-button",
			text: "تحديث",
		});
		setIcon(refreshButton, "refresh-cw");
		refreshButton.addEventListener("click", async () => {
			await this.props.onRefresh();
		});

		return refreshButton;
	}

	/**
	 * Renders the view toggle (table/card)
	 * @param container - Container to render into
	 */
	private renderViewToggle(container: HTMLElement): void {
		const viewToggleContainer = container.createEl("div", {
			cls: "alrawi-view-toggles",
		});

		// Table view toggle
		this.tableViewBtn = viewToggleContainer.createEl("button", {
			cls: `alrawi-view-toggle ${
				this.props.settings.viewMode === VIEW_MODE.TABLE ? "active" : ""
			}`,
			attr: { title: "عرض جدولي" },
		});
		setIcon(this.tableViewBtn, "table");
		this.tableViewBtn.createEl("span", {
			text: "جدول",
			cls: "alrawi-view-toggle-label",
		});
		this.tableViewBtn.addEventListener("click", () =>
			this.props.onViewModeChange(VIEW_MODE.TABLE)
		);

		// Card view toggle
		this.cardViewBtn = viewToggleContainer.createEl("button", {
			cls: `alrawi-view-toggle ${
				this.props.settings.viewMode === VIEW_MODE.CARD ? "active" : ""
			}`,
			attr: { title: "عرض البطاقات" },
		});
		setIcon(this.cardViewBtn, "grid");
		this.cardViewBtn.createEl("span", {
			text: "بطاقات",
			cls: "alrawi-view-toggle-label",
		});
		this.cardViewBtn.addEventListener("click", () =>
			this.props.onViewModeChange(VIEW_MODE.CARD)
		);
	}

	/**
	 * Updates UI elements that depend on selection state
	 */
	private updateSelectionDependentUI(): void {
		if (!this.props.selectionState || !this.exportButton) return;

		const hasSelection = this.props.selectionState.hasSelection();

		// Update export button text based on selection
		if (hasSelection) {
			const count = this.props.selectionState.getSelectionCount();
			this.exportButton.textContent = `تصدير (${count})`;
		} else {
			this.exportButton.textContent = "تصدير";
		}
	}

	/**
	 * Updates the view mode buttons
	 * @param viewMode - The current view mode
	 */
	public updateViewMode(viewMode: "table" | "card"): void {
		if (this.tableViewBtn && this.cardViewBtn) {
			if (viewMode === VIEW_MODE.TABLE) {
				this.tableViewBtn.classList.add("active");
				this.cardViewBtn.classList.remove("active");
			} else {
				this.tableViewBtn.classList.remove("active");
				this.cardViewBtn.classList.add("active");
			}
		}
	}

	/**
	 * Updates the content type buttons
	 * @param contentType - The current content type
	 */
	public updateContentType(contentType: ContentType): void {
		if (this.videosButton && this.booksButton && this.benefitsButton) {
			this.videosButton.classList.remove("active");
			this.booksButton.classList.remove("active");
			this.benefitsButton.classList.remove("active");

			if (contentType === CONTENT_TYPE.VIDEOS) {
				this.videosButton.classList.add("active");
			} else if (contentType === CONTENT_TYPE.BOOKS) {
				this.booksButton.classList.add("active");
			} else if (contentType === CONTENT_TYPE.BENEFITS) {
				this.benefitsButton.classList.add("active");
			}
		}
	}

	/**
	 * Clean up resources
	 */
	public destroy(): void {
		// Unsubscribe from state changes
		this.stateUnsubscribes.forEach((unsubscribe) => unsubscribe());
		this.stateUnsubscribes = [];

		// Clear references
		this.container = null;
		this.exportButton = null;
		this.videosButton = null;
		this.booksButton = null;
		this.benefitsButton = null;
		this.tableViewBtn = null;
		this.cardViewBtn = null;
	}
}
