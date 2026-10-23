// Staff texts for the menu: availability, the editor, products, option
// groups, ingredients and the site pages.
import type { TextDef } from './catalog';

const g = 'staffMenu' as const;

export const STAFF_MENU_TEXTS = {
	'avail.tabTitle': {
		group: g,
		label: 'Disponibilidade: título da aba',
		default: 'Cardápio · Equipe'
	},
	'avail.title': {
		group: g,
		label: 'Disponibilidade: título',
		default: 'Disponibilidade do cardápio'
	},
	'avail.edit': { group: g, label: 'Disponibilidade: editar cardápio', default: 'Editar cardápio' },
	'avail.intro': {
		group: g,
		label: 'Disponibilidade: texto',
		default:
			'Marcar como esgotado vale na hora para o caixa, o site e (quando ativo) o iFood. O produto continua cadastrado.'
	},
	'avail.empty': {
		group: g,
		label: 'Disponibilidade: cardápio vazio',
		default: 'O cardápio está vazio.'
	},
	'avail.emptyAdmin': {
		group: g,
		label: 'Disponibilidade: vazio (admin)',
		default: 'Cadastre os produtos em "Editar cardápio".'
	},
	'avail.emptyStaff': {
		group: g,
		label: 'Disponibilidade: vazio (equipe)',
		default: 'Peça a um admin para cadastrar os produtos.'
	},
	'avail.soldOutSince': {
		group: g,
		label: 'Disponibilidade: esgotado desde',
		default: 'Esgotado desde {time}'
	},
	'avail.unavailable': {
		group: g,
		label: 'Disponibilidade: indisponível',
		default: 'Indisponível: {reason}'
	},
	'avail.without': { group: g, label: 'Disponibilidade: sai sem', default: 'Sai sem {names}' },
	'avail.soldOutBack': {
		group: g,
		label: 'Disponibilidade: voltar de esgotado',
		default: 'Esgotado · voltar'
	},
	'avail.markSoldOut': {
		group: g,
		label: 'Disponibilidade: marcar esgotado',
		default: 'Marcar esgotado'
	},
	'avail.ingredients': {
		group: g,
		label: 'Disponibilidade: ingredientes',
		default: 'Ingredientes'
	},
	'avail.ingredientsHint': {
		group: g,
		label: 'Disponibilidade: ingredientes (dica)',
		default:
			'Se um ingrediente acabar, os produtos que não saem sem ele ficam indisponíveis; nos outros o cliente precisa pedir "sem".'
	},
	'avail.missingSince': {
		group: g,
		label: 'Disponibilidade: em falta desde',
		default: 'Em falta desde {time}'
	},
	'avail.markMissing': {
		group: g,
		label: 'Disponibilidade: marcar em falta',
		default: 'Marcar em falta'
	},
	'avail.missingBack': {
		group: g,
		label: 'Disponibilidade: voltar de em falta',
		default: 'Em falta · voltar'
	},
	'avail.extras': { group: g, label: 'Disponibilidade: adicionais', default: 'Adicionais' },
	'menuEdit.tabTitle': {
		group: g,
		label: 'Editar cardápio: título da aba',
		default: 'Editar cardápio · Equipe'
	},
	'menuEdit.title': { group: g, label: 'Editar cardápio: título', default: 'Editar cardápio' },
	'menuEdit.availability': {
		group: g,
		label: 'Editar cardápio: disponibilidade',
		default: 'Disponibilidade'
	},

	'menuEdit.newProduct': {
		group: g,
		label: 'Editar cardápio: novo produto',
		default: 'Novo produto'
	},
	'menuEdit.emptyTitle': {
		group: g,
		label: 'Editar cardápio: vazio (título)',
		default: 'O cardápio está vazio'
	},
	'menuEdit.emptyText': {
		group: g,
		label: 'Editar cardápio: vazio (texto)',
		default:
			'Crie uma categoria (por exemplo "Bebidas") e depois os produtos. Ou comece com o cardápio de exemplo e ajuste nomes, preços e fotos.'
	},
	'menuEdit.sample': {
		group: g,
		label: 'Editar cardápio: cardápio de exemplo',
		default: 'Carregar cardápio de exemplo'
	},
	'menuEdit.categories': {
		group: g,
		label: 'Editar cardápio: categorias e produtos',
		default: 'Categorias e produtos'
	},
	'menuEdit.categoryPhoto': {
		group: g,
		label: 'Editar cardápio: foto da categoria',
		default: 'Foto da categoria'
	},
	'menuEdit.removePhoto': { group: g, label: 'Editar cardápio: tirar foto', default: 'Tirar foto' },
	'group.optionPhoto': {
		group: g,
		label: 'Grupo: foto da opção',
		default: 'Foto de {name}'
	},
	'ingredients.photo': { group: g, label: 'Ingredientes: foto', default: 'Foto do ingrediente' },
	'menuEdit.order': { group: g, label: 'Editar cardápio: ordem', default: 'Ordem' },
	'menuEdit.categoryName': {
		group: g,
		label: 'Editar cardápio: nome da categoria',
		default: 'Nome da categoria'
	},
	'menuEdit.visibility': {
		group: g,
		label: 'Editar cardápio: visibilidade',
		default: 'Visibilidade'
	},
	'menuEdit.visible': { group: g, label: 'Editar cardápio: visível', default: 'Visível' },
	'menuEdit.hidden': { group: g, label: 'Editar cardápio: oculta', default: 'Oculta' },
	'menuEdit.save': { group: g, label: 'Editar cardápio: salvar', default: 'Salvar' },
	'menuEdit.cancel': { group: g, label: 'Editar cardápio: cancelar', default: 'Cancelar' },
	'menuEdit.hiddenMark': { group: g, label: 'Editar cardápio: marca oculta', default: '(oculta)' },
	'menuEdit.edit': { group: g, label: 'Editar cardápio: editar', default: 'Editar' },
	'menuEdit.delete': { group: g, label: 'Editar cardápio: apagar', default: 'Apagar' },
	'menuEdit.productHidden': {
		group: g,
		label: 'Editar cardápio: produto oculto',
		default: '· oculto'
	},
	'menuEdit.noProducts': {
		group: g,
		label: 'Editar cardápio: categoria vazia',
		default: 'Nenhum produto nesta categoria.'
	},
	'menuEdit.newCategory': {
		group: g,
		label: 'Editar cardápio: nova categoria',
		default: 'Nova categoria, por exemplo Bebidas'
	},
	'menuEdit.addCategory': {
		group: g,
		label: 'Editar cardápio: adicionar categoria',
		default: 'Adicionar categoria'
	},
	'menuEdit.groups': {
		group: g,
		label: 'Editar cardápio: grupos de opções',
		default: 'Grupos de opções'
	},
	'menuEdit.newGroup': { group: g, label: 'Editar cardápio: novo grupo', default: 'Novo grupo' },
	'menuEdit.groupsHint': {
		group: g,
		label: 'Editar cardápio: grupos (dica)',
		default: 'Adicionais, tamanhos, sabores. Um grupo pode ser usado em vários produtos.'
	},
	'menuEdit.groupSummary': {
		group: g,
		label: 'Editar cardápio: resumo do grupo',
		default: '{options} opções · escolhe {choose} · em {products} produtos'
	},
	'menuEdit.range': {
		group: g,
		label: 'Editar cardápio: faixa de escolhas',
		default: '{min} a {max}'
	},
	'menuEdit.noGroups': {
		group: g,
		label: 'Editar cardápio: sem grupos',
		default: 'Nenhum grupo ainda.'
	},
	'menuEdit.back': { group: g, label: 'Editar cardápio: voltar', default: '← Cardápio' },
	'sitePages.tabTitle': {
		group: g,
		label: 'Páginas: título da aba',
		default: 'Páginas do site · Equipe'
	},
	'sitePages.title': { group: g, label: 'Páginas: título', default: 'Páginas do site' },
	'sitePages.intro': {
		group: g,
		label: 'Páginas: texto',
		default:
			'Texto simples. Deixe uma linha em branco entre parágrafos. Comece a linha com "## " para um título.'
	},
	'sitePages.view': { group: g, label: 'Páginas: ver', default: 'Ver ↗' },
	'sitePages.text': { group: g, label: 'Páginas: texto de', default: 'Texto de {title}' },
	'sitePages.published': { group: g, label: 'Páginas: publicada', default: 'Publicada' },
	'sitePages.pageTitle': { group: g, label: 'Páginas: título de', default: 'Título de {title}' },
	'sitePages.saved': { group: g, label: 'Páginas: salvo', default: 'Salvo.' },
	'sitePages.new': { group: g, label: 'Páginas: nova página', default: 'Nova página' },
	'sitePages.newPlaceholder': {
		group: g,
		label: 'Páginas: exemplo de nova página',
		default: 'Ex.: Trabalhe conosco'
	},
	'sitePages.create': { group: g, label: 'Páginas: criar', default: 'Criar página' },
	'sitePages.created': {
		group: g,
		label: 'Páginas: criada',
		default: 'Página criada. Escreva o texto e marque "Publicada" para ela aparecer no rodapé.'
	},
	'sitePages.delete': { group: g, label: 'Páginas: excluir', default: 'Excluir página' },
	'sitePages.deleteConfirm': {
		group: g,
		label: 'Páginas: confirmar exclusão',
		default: 'Excluir "{title}"?'
	},
	'sitePages.deleteText': {
		group: g,
		label: 'Páginas: exclusão (aviso)',
		default: 'O endereço da página deixa de funcionar e ela sai do rodapé.'
	},
	'group.tabTitle': { group: g, label: 'Grupo: título da aba', default: '{name} · Cardápio' },
	'group.new': { group: g, label: 'Grupo: novo (aba)', default: 'Novo grupo' },
	'group.newTitle': { group: g, label: 'Grupo: novo (título)', default: 'Novo grupo de opções' },
	'group.saved': { group: g, label: 'Grupo: salvo', default: 'Salvo.' },
	'group.name': { group: g, label: 'Grupo: nome', default: 'Nome do grupo' },
	'group.namePlaceholder': { group: g, label: 'Grupo: exemplo de nome', default: 'Adicionais' },
	'group.min': { group: g, label: 'Grupo: mínimo', default: 'Mínimo de escolhas' },
	'group.minHint': {
		group: g,
		label: 'Grupo: mínimo (dica)',
		default: '0 = opcional. 1 = obrigatório (ex.: tamanho).'
	},
	'group.max': { group: g, label: 'Grupo: máximo', default: 'Máximo de escolhas' },
	'group.options': { group: g, label: 'Grupo: opções', default: 'Opções' },
	'group.optionName': { group: g, label: 'Grupo: nome da opção', default: 'Nome' },
	'group.optionNamePlaceholder': { group: g, label: 'Grupo: exemplo de opção', default: 'Grande' },
	'group.optionPrice': { group: g, label: 'Grupo: preço extra', default: 'Preço extra' },
	'group.optionMax': { group: g, label: 'Grupo: até', default: 'Até' },
	'group.optionActive': { group: g, label: 'Grupo: ativa', default: 'Ativa' },
	'group.removeOption': {
		group: g,
		label: 'Grupo: remover opção (descrição)',
		default: 'Remover {name}'
	},
	'group.option': { group: g, label: 'Grupo: opção sem nome', default: 'opção' },
	'group.remove': { group: g, label: 'Grupo: remover', default: 'Remover' },
	'group.code': { group: g, label: 'Grupo: código', default: 'Código: {sku}' },
	'group.addOption': { group: g, label: 'Grupo: adicionar opção', default: 'Adicionar opção' },
	'group.usedBy': { group: g, label: 'Grupo: usado em', default: 'Usado em:' },
	'group.noProduct': { group: g, label: 'Grupo: nenhum produto', default: 'nenhum produto' },
	'group.delete': { group: g, label: 'Grupo: apagar', default: 'Apagar grupo' },
	'group.deleteAsk': { group: g, label: 'Grupo: apagar…', default: 'Apagar grupo…' },
	'ingredients.tabTitle': {
		group: g,
		label: 'Ingredientes: título da aba',
		default: 'Ingredientes · Cardápio'
	},
	'ingredients.title': { group: g, label: 'Ingredientes: título', default: 'Ingredientes' },
	'ingredients.introBefore': {
		group: g,
		label: 'Ingredientes: texto',
		default:
			'Cadastre aqui o que vai nos produtos e marque em cada produto quais ingredientes ele usa. Os alergênicos dos ingredientes aparecem sozinhos no produto. Quando um ingrediente acabar, marque em'
	},
	'ingredients.availability': {
		group: g,
		label: 'Ingredientes: link disponibilidade',
		default: 'Disponibilidade'
	},
	'ingredients.new': { group: g, label: 'Ingredientes: novo', default: 'Novo ingrediente' },
	'ingredients.newPlaceholder': {
		group: g,
		label: 'Ingredientes: exemplo',
		default: 'Nome do ingrediente'
	},
	'ingredients.allergensComma': {
		group: g,
		label: 'Ingredientes: alergênicos (vírgula)',
		default: 'Alergênicos (vírgula)'
	},
	'ingredients.allergensPlaceholder': {
		group: g,
		label: 'Ingredientes: exemplo de alergênico',
		default: 'lactose'
	},
	'ingredients.add': { group: g, label: 'Ingredientes: adicionar', default: 'Adicionar' },
	'ingredients.none': {
		group: g,
		label: 'Ingredientes: nenhum',
		default: 'Nenhum ingrediente ainda.'
	},
	'ingredients.name': { group: g, label: 'Ingredientes: nome', default: 'Nome' },
	'ingredients.allergens': { group: g, label: 'Ingredientes: alergênicos', default: 'Alergênicos' },
	'ingredients.missing': { group: g, label: 'Ingredientes: em falta', default: 'Em falta' },
	'ingredients.allergensLine': {
		group: g,
		label: 'Ingredientes: linha de alergênicos',
		default: 'Alergênicos: {list} ·'
	},
	'ingredients.usedIn': { group: g, label: 'Ingredientes: usado em', default: 'Usado em {list}' },
	'ingredients.unused': {
		group: g,
		label: 'Ingredientes: não usado',
		default: 'Não está em nenhum produto'
	},
	'ingredients.deleteAsk': {
		group: g,
		label: 'Ingredientes: confirmar apagar',
		default: 'Apagar e tirar dos produtos?'
	},
	'ingredients.no': { group: g, label: 'Ingredientes: não', default: 'Não' },
	'ingredients.deleteMore': { group: g, label: 'Ingredientes: apagar…', default: 'Apagar…' },
	'product.tabTitle': { group: g, label: 'Produto: título da aba', default: '{name} · Cardápio' },
	'product.new': { group: g, label: 'Produto: novo', default: 'Novo produto' },
	'product.saved': { group: g, label: 'Produto: salvo', default: 'Salvo.' },
	'product.preview': {
		group: g,
		label: 'Produto: como aparece',
		default: 'Como aparece no cardápio'
	},
	'product.noPhoto': { group: g, label: 'Produto: sem foto', default: 'Sem foto' },
	'product.namePlaceholder': {
		group: g,
		label: 'Produto: nome (prévia)',
		default: 'Nome do produto'
	},
	'product.name': { group: g, label: 'Produto: nome', default: 'Nome' },
	'product.description': { group: g, label: 'Produto: descrição', default: 'Descrição' },
	'product.price': { group: g, label: 'Produto: preço', default: 'Preço (R$)' },
	'product.category': { group: g, label: 'Produto: categoria', default: 'Categoria' },
	'product.station': { group: g, label: 'Produto: preparado em', default: 'Preparado em' },
	'product.position': { group: g, label: 'Produto: ordem', default: 'Ordem na categoria' },
	'product.photo': { group: g, label: 'Produto: foto', default: 'Foto' },
	'product.removePhoto': { group: g, label: 'Produto: remover foto', default: 'Remover foto' },
	'product.photoHint': {
		group: g,
		label: 'Produto: foto (dica)',
		default: 'JPG, PNG ou WebP, até 5 MB. A foto é cortada no centro no formato do cardápio (4:3).'
	},
	'product.channels': { group: g, label: 'Produto: vender em', default: 'Vender em' },
	'product.channel.counter': { group: g, label: 'Produto: canal caixa', default: 'Caixa' },
	'product.channel.web': { group: g, label: 'Produto: canal site', default: 'Site' },
	'product.channel.ifood': { group: g, label: 'Produto: canal iFood', default: 'iFood' },
	'product.groups': { group: g, label: 'Produto: grupos de opções', default: 'Grupos de opções' },
	'product.ingredients': { group: g, label: 'Produto: ingredientes', default: 'Ingredientes' },
	'product.ingredientsHint': {
		group: g,
		label: 'Produto: ingredientes (dica)',
		default:
			'Marque o que vai no produto. "Cliente pode retirar" mostra a opção "sem" no site e no caixa. Quando um ingrediente que não pode ser retirado acaba, o produto fica indisponível.'
	},
	'product.removable': {
		group: g,
		label: 'Produto: cliente pode retirar',
		default: 'Cliente pode retirar'
	},
	'product.noIngredients': {
		group: g,
		label: 'Produto: sem ingredientes',
		default: 'Nenhum ingrediente cadastrado. Cadastre em'
	},
	'product.ingredientsLink': {
		group: g,
		label: 'Produto: link ingredientes',
		default: 'Ingredientes'
	},
	'product.allergens': {
		group: g,
		label: 'Produto: outros alergênicos',
		default: 'Outros alergênicos (separados por vírgula; os dos ingredientes entram sozinhos)'
	},
	'product.allergensPlaceholder': {
		group: g,
		label: 'Produto: exemplo de alergênicos',
		default: 'glúten, lactose'
	},
	'product.sku': { group: g, label: 'Produto: código opcional', default: 'Código (SKU), opcional' },
	'product.skuPlaceholder': {
		group: g,
		label: 'Produto: código gerado',
		default: 'Gerado a partir do nome'
	},
	'product.skuHint': {
		group: g,
		label: 'Produto: código (dica)',
		default:
			'Use o mesmo código como "código externo" no cardápio do iFood. Não pode ser mudado depois.'
	},
	'product.skuShow': {
		group: g,
		label: 'Produto: código',
		default: 'Código (SKU): {sku}. Use este código como "código externo" no cardápio do iFood.'
	},
	'product.active': {
		group: g,
		label: 'Produto: mostrar no cardápio',
		default: 'Mostrar no cardápio'
	},
	'product.saving': { group: g, label: 'Produto: salvando', default: 'Salvando…' },
	'product.save': { group: g, label: 'Produto: salvar', default: 'Salvar' },
	'product.deleteText': {
		group: g,
		label: 'Produto: confirmar apagar',
		default:
			'Apagar {name}? Pedidos antigos continuam com o nome e o preço da época. Para tirar do cardápio por um tempo, desmarque "Mostrar no cardápio".'
	},
	'product.delete': { group: g, label: 'Produto: apagar', default: 'Apagar produto' },
	'product.deleteAsk': { group: g, label: 'Produto: apagar…', default: 'Apagar produto…' },
	'product.cancel': { group: g, label: 'Produto: cancelar', default: 'Cancelar' }
} as const satisfies Record<string, TextDef>;
