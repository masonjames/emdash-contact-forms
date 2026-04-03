import { blocks, elements } from "@emdash-cms/blocks";
import type { Block, Element, FormField } from "@emdash-cms/blocks";

export type { Block, Element, FormField };

export const header = blocks.header;
export const context = blocks.context;
export const divider = blocks.divider;
export const section = blocks.section;
export const button = elements.button;
export const select = elements.select;
export const textInput = elements.textInput;
export const numberInput = elements.numberInput;

export function fields(items: Array<{ label: string; value: string }>, blockId?: string): Block {
	return blocks.fields(items, blockId ? { blockId } : undefined);
}

export function actions(items: Element[], blockId?: string): Block {
	return blocks.actions(items, blockId ? { blockId } : undefined);
}

export function form(opts: {
	blockId?: string;
	fields: FormField[];
	submit: { label: string; actionId: string };
}): Block {
	return blocks.form(opts);
}
