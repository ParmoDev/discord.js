import type { DeclarationReflection, LiteralType } from 'typedoc';
import { DocumentedItemMeta } from './item-meta.js';
import { DocumentedItem } from './item.js';
import { DocumentedParam } from './param.js';
import { DocumentedVarType } from './var-type.js';
import type { Typedef } from '../interfaces/index.js';
import { parseType } from '../util/parseType.js';
import { isReflectionType } from '../util/types.js';

export class DocumentedTypeDef extends DocumentedItem<Typedef | DeclarationReflection> {
	public override serializer() {
		if (this.config.typescript) {
			const data = this.data as DeclarationReflection;
			const signature = (data.signatures ?? [])[0] ?? data;
			let meta;

			const sources = data.sources?.[0];
			if (sources) {
				meta = new DocumentedItemMeta(sources, this.config).serialize();
			}

			// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
			const see = signature.comment?.blockTags?.filter((t) => t.tag === '@see').length
				? signature.comment.blockTags
						.filter((t) => t.tag === '@see')
						.map((t) => t.content.find((c) => c.kind === 'text')?.text.trim())
				: undefined;

			const baseReturn = {
				name: signature.name,
				// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition, @typescript-eslint/prefer-nullish-coalescing
				description: signature.comment?.summary?.reduce((prev, curr) => (prev += curr.text), '').trim() || undefined,
				see,
				access:
					data.flags.isPrivate ||
					// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
					signature.comment?.blockTags?.some((t) => t.tag === '@private' || t.tag === '@internal')
						? 'private'
						: undefined,
				// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
				deprecated: signature.comment?.blockTags?.some((t) => t.tag === '@deprecated')
					? signature.comment.blockTags
							.find((t) => t.tag === '@deprecated')
							?.content.reduce((prev, curr) => (prev += curr.text), '')
							.trim() ?? true
					: undefined,
				type: signature.type
					? new DocumentedVarType({ names: [parseType(signature.type)] }, this.config).serialize()
					: undefined,
				meta,
			};

			let typeDef: DeclarationReflection | undefined;
			if (isReflectionType(data.type)) {
				typeDef = data.type.declaration;
			} else if (data.kindString === 'Interface') {
				typeDef = data;
			} else if (data.kindString === 'Enumeration') {
				return {
					...baseReturn,
					props: data.children?.length
						? data.children.map((child) => ({
								name: child.name,
								description:
									child.comment?.summary
										// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
										?.reduce((prev, curr) => (prev += curr.text), '')
										// eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
										.trim() || undefined,
								type: [[[(child.type as LiteralType | undefined)?.value]]],
						  }))
						: undefined,
				};
			}

			if (typeDef) {
				const { children, signatures } = typeDef;

				if (children && children.length > 0) {
					const props = children.map((child) => ({
						name: child.name,
						description:
							child.comment?.summary
								// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
								?.reduce((prev, curr) => (prev += curr.text), '')
								// eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
								.trim() ||
							// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition, @typescript-eslint/prefer-nullish-coalescing
							child.signatures?.[0]?.comment?.summary?.reduce((prev, curr) => (prev += curr.text), '').trim() ||
							undefined,
						optional: child.flags.isOptional || typeof child.defaultValue != 'undefined',
						default:
							(child.defaultValue === '...' ? undefined : child.defaultValue) ??
							(child.comment?.blockTags
								// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
								?.find((t) => t.tag === '@default')
								?.content.reduce((prev, curr) => (prev += curr.text), '')
								// eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
								.trim() ||
								undefined),
						type: child.type
							? new DocumentedVarType({ names: [parseType(child.type)] }, this.config).serialize()
							: child.kindString === 'Method'
							? new DocumentedVarType(
									{
										names: [
											parseType({
												type: 'reflection',
												declaration: child,
											}),
										],
										description: child.signatures?.[0]?.comment?.blockTags
											// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
											?.find((t) => t.tag === '@returns')
											?.content.reduce((prev, curr) => (prev += curr.text), '')
											.trim(),
									},
									this.config,
							  ).serialize()
							: undefined,
					}));

					return {
						...baseReturn,
						props,
					};
				}

				if (signatures && signatures.length > 0) {
					const sig = signatures[0];

					const params = sig?.parameters?.map((param) => ({
						name: param.name,
						// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition, @typescript-eslint/prefer-nullish-coalescing
						description: param.comment?.summary?.reduce((prev, curr) => (prev += curr.text), '').trim() || undefined,
						optional: param.flags.isOptional || typeof param.defaultValue != 'undefined',
						default:
							(param.defaultValue === '...' ? undefined : param.defaultValue) ??
							(param.comment?.blockTags
								// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
								?.find((t) => t.tag === '@default')
								?.content.reduce((prev, curr) => (prev += curr.text), '')
								// eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
								.trim() ||
								undefined),
						type: param.type
							? new DocumentedVarType({ names: [parseType(param.type)] }, this.config).serialize()
							: undefined,
					}));

					// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
					const see = sig?.comment?.blockTags?.filter((t) => t.tag === '@see').length
						? sig.comment.blockTags
								.filter((t) => t.tag === '@see')
								.map((t) => t.content.find((c) => c.kind === 'text')?.text.trim())
						: undefined;

					return {
						...baseReturn,
						// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition, @typescript-eslint/prefer-nullish-coalescing
						description: sig?.comment?.summary?.reduce((prev, curr) => (prev += curr.text), '').trim() || undefined,
						see,
						access:
							sig?.flags.isPrivate ||
							// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
							sig?.comment?.blockTags?.some((t) => t.tag === '@private' || t.tag === '@internal')
								? 'private'
								: undefined,
						// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
						deprecated: sig?.comment?.blockTags?.some((t) => t.tag === '@deprecated')
							? sig.comment.blockTags
									.find((t) => t.tag === '@deprecated')
									?.content.reduce((prev, curr) => (prev += curr.text), '')
									.trim() ?? true
							: undefined,
						params,
						returns: sig?.type
							? [
									new DocumentedVarType(
										{
											names: [parseType(sig.type)],
											description:
												sig.comment?.blockTags
													// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
													?.find((t) => t.tag === '@returns')
													?.content.reduce((prev, curr) => (prev += curr.text), '')
													// eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
													.trim() || undefined,
										},
										this.config,
									).serialize(),
							  ]
							: undefined,
						returnsDescription:
							sig?.comment?.blockTags
								// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
								?.find((t) => t.tag === '@returns')
								?.content.reduce((prev, curr) => (prev += curr.text), '')
								// eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
								.trim() || undefined,
						meta,
					};
				}
			}

			return baseReturn;
		}

		const data = this.data as Typedef;
		return {
			name: data.name,
			description: data.description,
			see: data.see,
			access: data.access,
			deprecated: data.deprecated,
			type: new DocumentedVarType(data.type, this.config).serialize(),
			props: data.properties?.length
				? data.properties.map((p) => new DocumentedParam(p, this.config).serialize())
				: undefined,
			params: data.params?.length ? data.params.map((p) => new DocumentedParam(p, this.config).serialize()) : undefined,
			returns: data.returns?.length
				? data.returns.map((p) => new DocumentedVarType(p, this.config).serialize())
				: undefined,
			meta: new DocumentedItemMeta(data.meta, this.config).serialize(),
		};
	}
}
