/**
 * @extends {ActorSheet}
 */
export class IASActorSheet extends ActorSheet {

    /** @override */
    static get defaultOptions() {
        return mergeObject(super.defaultOptions, {
            template: "systems/ias-fsg/templates/actor/actor-sheet.html",
            width: 600,
            height: 600,
            tabs: [{ navSelector: ".nav", contentSelector: ".sheet__body", initial: "skills" }]
        });
    }

    /** @override */
    get template() {
        return `systems/ias-fsg/templates/actor/actor-${this.actor.type}-sheet.html`;
    }

    /** @override */
    getData() {
        const context = super.getData();
        const actorData = this.actor.toObject(false);

        context.system = actorData.system;
        context.flags = actorData.flags;

        if (actorData.type == 'character') {
            this._prepareCharacterData(context);
            this._prepareItems(context);
        }

        context.rollData = context.actor.getRollData();

        return context;
    }

    _prepareCharacterData(context) {
        for (let [k, v] of Object.entries(context.system.reserves)) {
            v.label = game.i18n.localize(CONFIG.IAS.reserves[k]) ?? k;
        }
        for (let [k, v] of Object.entries(context.system.status)) {
            v.label = game.i18n.localize(CONFIG.IAS.status[k]) ?? k;
        }
        for (let [k, v] of Object.entries(context.system.attributes)) {
            v.label = game.i18n.localize(CONFIG.IAS.attributes[k]) ?? k;
        }
    }

    /**
   * @param {Object} actorData
   *
   * @return {undefined}
   */
    _prepareItems(context) {
        const skills = [];

        for (let i of context.items) {
            i.img = i.img || DEFAULT_TOKEN;
            if (i.type === 'skill') {
                skills.push(i);
            }
        }

        context.skills = skills;
    }


    /** @override */
    activateListeners(html) {
        super.activateListeners(html);

        html.find('.rollable').click(this._onRoll.bind(this));

        html.find('.status__img').click(this._toggleStatus.bind(this));

        html.find('.talent__poolmod').click(this._addAttributePoolMod.bind(this));
        html.find('.talent__poolmodremover').click(this._removeAttributePoolMod.bind(this));

        html.find('.viewmode').click(this._switchToEditMode.bind(this));
        html.find('.editmode').blur(this._switchToViewMode.bind(this));

        html.find('.item-create').click(ev => {
            this._onItemCreate(ev).then((item) => item.sheet.render(true));
        });
        html.find('.item-edit').click(ev => {
            const sheetItem = $(ev.currentTarget).parents(".item");
            const item = this.actor.items.get(sheetItem.data("itemId"));
            item.sheet.render(true);
        });
        html.find('.item-delete').click(ev => {
            const sheetItem = $(ev.currentTarget).parents(".item");
            const item = this.actor.items.get(sheetItem.data("itemId"));

            let d = new Dialog({
                title: game.i18n.format("IAS.DeletionModal.Title", {itemName: item.name}),
                content: "<p>" + game.i18n.format("IAS.DeletionModal.Content", {itemName: item.name}) + "</p>",
                buttons: {
                    yes: {
                        icon: '<i class="fas fa-check"></i>',
                        label: game.i18n.localize("IAS.Yes"),
                        callback: () => {
                            item.delete();
                            sheetItem.slideUp(200, () => this.render(false));
                        }
                    },
                    no: {
                        icon: '<i class="fas fa-times"></i>',
                        label: game.i18n.localize("IAS.No"),
                    }
                },
                default: "no"
            });
            d.render(true);
        });
    }

    _onRoll(event) {
        event.preventDefault();
        const element = event.currentTarget;
        const dataset = element.dataset;

        //todo
    }

    _toggleStatus(event) {
        event.preventDefault();
        const element = event.currentTarget;

        element.classList.toggle("status__img--active");
    }

    _addAttributePoolMod(event) {
        event.preventDefault();
        const element = event.currentTarget;
        const attributeKey = element.dataset.attribute;
        let attributesCopy = duplicate(this.actor.system.attributes);
        let attributePoolMod = attributesCopy[attributeKey].poolMod;
        let globalPoolMod = 0;

        /*todo extract getGlobalPoolMod to actor*/
        for (let attributeVal of Object.values(attributesCopy)) {
            globalPoolMod = globalPoolMod + attributeVal.poolMod;
        }

        if (globalPoolMod < 2) {
            attributePoolMod++;
        } else {
            return ui.notifications.warn(game.i18n.localize(CONFIG.IAS.alert.maxPoolMod));
        }

        attributesCopy[attributeKey].poolMod = attributePoolMod;
        this.actor.update({ "system.attributes": attributesCopy });
    }

    _removeAttributePoolMod(event) {
        event.preventDefault();
        const element = event.currentTarget;
        const attributeKey = element.dataset.attribute;
        let attributesCopy = duplicate(this.actor.system.attributes);

        attributesCopy[attributeKey].poolMod = 0;
        this.actor.update({ "system.attributes": attributesCopy });
    }

    _switchToEditMode(event) {
        event.preventDefault();
        const element = event.currentTarget;
        const editElement = document.querySelector('[data-element*="' + element.dataset.element + 'Edit' + '"]');

        element.classList.toggle("invisible");
        editElement.classList.toggle("invisible");
        editElement.focus();

    }

    _switchToViewMode(event) {
        event.preventDefault();
        const editElement = event.currentTarget;

        if (editElement.value === editElement.dataset.lastValue) {
            const element = document.querySelector('[data-element*="' + editElement.dataset.element.slice(0, editElement.dataset.element.length - 4) + '"]');

            element.classList.toggle("invisible");
            editElement.classList.toggle("invisible");
        }
    }


    /**
     * @param {Event} event
     * @private
     */
    async _onItemCreate(event) {
        event.preventDefault();
        const header = event.currentTarget;
        const type = header.dataset.type;
        const name = `New ${type.capitalize()}`;

        const itemData = {
            name: name,
            type: type
        };

        return await Item.create(itemData, { parent: this.actor });
    }
}