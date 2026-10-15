import {
	Editor,
	MarkdownView,
	MarkdownFileInfo,
	Modal,
	Notice,
	Plugin,
    TAbstractFile,
    TFile,
} from 'obsidian';

// Remember to rename these classes and interfaces!

export default class MyPlugin extends Plugin {

    private isInternalWrite = false;

    private debouncedModify = this.debounce(async (editor: Editor, currentContent: string) => {
        await this.performFileModification(editor, currentContent);
    }, 200);

	async onload() {

		// This adds a status bar item to the bottom of the app. Does not work on mobile apps.
		const statusBarItemEl = this.addStatusBarItem();
		statusBarItemEl.setText('Time keeper is working 😎');

        this.registerEvent(
            this.app.workspace.on('editor-change', (editor, info) => {
                const file = info.file;
                if (!file) return;

                const currentContent = editor.getValue();

                const metadata = this.app.metadataCache.getFileCache(file);
                //console.log(metadata);

                const tags = metadata?.frontmatter?.tags ?? [];
                //console.log(tags);

                // when #randomtext in tags array

                const flag_tags = tags.includes('timekeeping');
                const flag_empty_table_row = this.isEmptyTableRow(currentContent);

                //console.log('Flag tags:', flag_tags);
                //console.log('Empty table row:', flag_empty_table_row);


                if (flag_tags && flag_empty_table_row) {
                    if (!this.isInternalWrite) {
                        this.debouncedModify(editor, currentContent);
                    }
                }

            })
        );

	}

    private isEmptyTableRow(content: string): boolean {
        const rows = content.split('\n');

        // print last row for debugging
        //console.log('Last row:', rows[rows.length - 1]);

        for (const row of rows) {

            // replace all spaces with empty string for comparison
            const cleanedRow = row.replace(/\s/g, '');

            //console.log('Cleaned row:', cleanedRow);

            if (cleanedRow === '||||||') {
                return true;
            }
        }
        return false;
    }


    private async performFileModification(editor: Editor, currentContentInput: string) {
        try {
            // Set the flag to true before we touch the file
            this.isInternalWrite = true;

            let currentContent = currentContentInput;

            const rows = currentContent.split('\n');

            for (const [i, row] of rows.entries()) {
                const cleanedRow = row.replace(/\s/g, '');
                if (cleanedRow === '||||||') {

                    // create today if format DD.MM.YYYY
                    const today = new Date();
                    const day = String(today.getDate()).padStart(2, '0');
                    const month = String(today.getMonth() + 1).padStart(2, '0');
                    const year = today.getFullYear();
                    const formattedToday = `${day}.${month}.${year}`;

                    // create from current time something like HH:MM but round MM to nearest 5 minutes backward
                    const now = new Date();
                    const hours = String(now.getHours()).padStart(2, '0');
                    const minutes = Math.floor(now.getMinutes() / 5) * 5;
                    const roundedMinutes = String(minutes).padStart(2, '0');
                    const formattedTime = `${hours}:${roundedMinutes}`;

                    rows[i] = `| ${formattedToday} | ${formattedTime} |  | | |`;
                    break; // stop after the first replacement
                }
            }
            const newContent = rows.join('\n');

            //console.log('New content:', newContent);
            
            // new + 1 second timestamp for mtime
            const mtime = Date.now() + 1000;

            editor.setValue(newContent);

            this.isInternalWrite = false;

            //console.log('File successfully updated internally.');

        } catch (error) {
            console.error('Error modifying file:', error);
        } finally {
            // Crucial: Release the flag after the write operation finishes
            // (Using setTimeout allows the filesystem watcher event loop to cycle past the change event)
            window.setTimeout(() => {
                this.isInternalWrite = false;
            }, 100);
        }
    }

    private debounce<Args extends unknown[]>(
        func: (...args: Args) => Promise<void>,
        delay: number,
    ): (...args: Args) => void {
      let timer: number | undefined;
      return (...args: Args) => {
        window.clearTimeout(timer);
        timer = window.setTimeout(() => {
          func(...args).catch((error: unknown) => {
            console.error('Error running debounced modification:', error);
          });
        }, delay);
      };
    }

	onunload() {
    }


}
