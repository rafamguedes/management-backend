"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PalletService = void 0;
const SequelizePallet_1 = require("../database/models/SequelizePallet");
const SequelizeUser_1 = require("../database/models/SequelizeUser");
const SequelizeProduct_1 = require("../database/models/SequelizeProduct");
const SequelizeSlot_1 = require("../database/models/SequelizeSlot");
const sequelize_1 = require("sequelize");
class PalletService {
    constructor() {
        this.PALLET_NOT_FOUND = 'Pallet not found';
        this.PALLET_ALREADY_EXISTS = 'Pallet already exists, please try a different QR code';
        this.ERROR_CREATING_PALLET = 'Failed to create pallet, please try again';
        this.ERROR_FETCHING_PALLETS = 'Failed to get pallets, please try again';
        this.ERROR_UPDATING_PALLET = 'Failed to update pallet, please try again';
        this.ERROR_DELETING_PALLET = 'Failed to delete pallet, please try again';
        this.palletModel = SequelizePallet_1.default;
        this.userModel = SequelizeUser_1.default;
        this.productModel = SequelizeProduct_1.default;
        this.slotModel = SequelizeSlot_1.default;
    }
    async findAll() {
        try {
            const pallets = await this.palletModel.findAll();
            if (!pallets || pallets.length === 0) {
                return { status: 'NOT_FOUND', data: { message: 'No pallets found' } };
            }
            return { status: 'SUCCESSFUL', data: pallets };
        }
        catch (error) {
            return { status: 'INTERNAL_ERROR', data: { message: this.ERROR_FETCHING_PALLETS } };
        }
    }
    async findById(id) {
        try {
            const pallet = await this.palletModel.findByPk(id);
            if (!pallet) {
                return { status: 'NOT_FOUND', data: { message: this.PALLET_NOT_FOUND } };
            }
            return { status: 'SUCCESSFUL', data: pallet };
        }
        catch (error) {
            return { status: 'INTERNAL_ERROR', data: { message: this.ERROR_FETCHING_PALLETS } };
        }
    }
    async findBySlot(slotId) {
        try {
            const pallets = await this.palletModel.findAll({ where: { slotId } });
            if (!pallets || pallets.length === 0) {
                return { status: 'NOT_FOUND', data: { message: 'No pallets found in this slot' } };
            }
            return { status: 'SUCCESSFUL', data: pallets };
        }
        catch (error) {
            return { status: 'INTERNAL_ERROR', data: { message: this.ERROR_FETCHING_PALLETS } };
        }
    }
    async findByType(type) {
        try {
            const pallets = await this.palletModel.findAll({ where: { type } });
            if (!pallets || pallets.length === 0) {
                return { status: 'NOT_FOUND', data: { message: `No ${type} pallets found` } };
            }
            return { status: 'SUCCESSFUL', data: pallets };
        }
        catch (error) {
            return { status: 'INTERNAL_ERROR', data: { message: this.ERROR_FETCHING_PALLETS } };
        }
    }
    async findByQrCode(qrCode) {
        try {
            const pallet = await this.palletModel.findOne({ where: { qrCode } });
            if (!pallet) {
                return { status: 'NOT_FOUND', data: { message: this.PALLET_NOT_FOUND } };
            }
            return { status: 'SUCCESSFUL', data: pallet };
        }
        catch (error) {
            return { status: 'INTERNAL_ERROR', data: { message: this.ERROR_FETCHING_PALLETS } };
        }
    }
    async findByQrCodeSmall(qrCodeSmall) {
        try {
            const pallet = await this.palletModel.findOne({ where: { qrCodeSmall } });
            if (!pallet) {
                return { status: 'NOT_FOUND', data: { message: this.PALLET_NOT_FOUND } };
            }
            return { status: 'SUCCESSFUL', data: pallet };
        }
        catch (error) {
            return { status: 'INTERNAL_ERROR', data: { message: this.ERROR_FETCHING_PALLETS } };
        }
    }
    async findUnassigned() {
        try {
            const pallets = await this.palletModel.findAll({ where: { slotId: null } });
            if (!pallets || pallets.length === 0) {
                return { status: 'NOT_FOUND', data: { message: 'No unassigned pallets found' } };
            }
            return { status: 'SUCCESSFUL', data: pallets };
        }
        catch (error) {
            return { status: 'INTERNAL_ERROR', data: { message: this.ERROR_FETCHING_PALLETS } };
        }
    }
    async create(palletData) {
        try {
            // Validate user if provided
            if (palletData.userId) {
                const user = await this.userModel.findByPk(palletData.userId);
                if (!user) {
                    return { status: 'NOT_FOUND', data: { message: 'User not found' } };
                }
            }
            // Validate product if provided
            if (palletData.productId) {
                const product = await this.productModel.findByPk(palletData.productId);
                if (!product) {
                    return { status: 'NOT_FOUND', data: { message: 'Product not found' } };
                }
            }
            // Validate and check slot availability if provided
            if (palletData.slotId) {
                const slot = await this.slotModel.findByPk(palletData.slotId);
                if (!slot) {
                    return { status: 'NOT_FOUND', data: { message: 'Slot not found' } };
                }
                if (slot.status !== 'available') {
                    return { status: 'CONFLICT', data: { message: 'Slot is not available' } };
                }
            }
            // Generate simple QR codes (text format instead of SVG to avoid potential issues)
            const timestamp = Date.now();
            const randomSuffix = Math.random().toString(36).substring(2, 8).toUpperCase();
            const qrCodeText = `PAL-${palletData.type.toUpperCase()}-${timestamp}-${randomSuffix}`;
            const qrCodeSmallText = `PAL-SM-${timestamp}-${randomSuffix}`;
            const dataToCreate = {
                type: palletData.type,
                slotId: palletData.slotId || null,
                userId: palletData.userId || null,
                productId: palletData.productId || null,
                qrCode: qrCodeText,
                qrCodeSmall: qrCodeSmallText,
            };
            const newPallet = await this.palletModel.create(dataToCreate);
            if (!newPallet) {
                return { status: 'INTERNAL_ERROR', data: { message: this.ERROR_CREATING_PALLET } };
            }
            // Update slot status if a slot was assigned
            if (palletData.slotId) {
                await this.slotModel.update({ status: 'occupied' }, { where: { id: palletData.slotId } });
            }
            return { status: 'CREATED', data: newPallet.get() };
        }
        catch (error) {
            console.error('Error creating pallet:', error);
            return { status: 'INTERNAL_ERROR', data: { message: this.ERROR_CREATING_PALLET } };
        }
    }
    async update(id, palletData) {
        try {
            // Check if trying to update QR codes to existing ones
            if (palletData.qrCode || palletData.qrCodeSmall) {
                const existingPallet = await this.palletModel.findOne({
                    where: {
                        [sequelize_1.Op.or]: [
                            ...(palletData.qrCode ? [{ qrCode: palletData.qrCode }] : []),
                            ...(palletData.qrCodeSmall ? [{ qrCodeSmall: palletData.qrCodeSmall }] : [])
                        ]
                    }
                });
                if (existingPallet && existingPallet.id !== id) {
                    return { status: 'CONFLICT', data: { message: this.PALLET_ALREADY_EXISTS } };
                }
            }
            const [affectedRows] = await this.palletModel.update(palletData, { where: { id } });
            if (affectedRows === 0) {
                return { status: 'NOT_FOUND', data: { message: this.PALLET_NOT_FOUND } };
            }
            const updatedPallet = await this.palletModel.findByPk(id);
            return { status: 'SUCCESSFUL', data: updatedPallet };
        }
        catch (error) {
            return { status: 'INTERNAL_ERROR', data: { message: this.ERROR_UPDATING_PALLET } };
        }
    }
    async assignToSlot(id, slotId) {
        try {
            const [affectedRows] = await this.palletModel.update({ slotId }, { where: { id } });
            if (affectedRows === 0) {
                return { status: 'NOT_FOUND', data: { message: this.PALLET_NOT_FOUND } };
            }
            const updatedPallet = await this.palletModel.findByPk(id);
            return { status: 'SUCCESSFUL', data: updatedPallet };
        }
        catch (error) {
            return { status: 'INTERNAL_ERROR', data: { message: this.ERROR_UPDATING_PALLET } };
        }
    }
    async unassignFromSlot(id) {
        try {
            const [affectedRows] = await this.palletModel.update({ slotId: null }, { where: { id } });
            if (affectedRows === 0) {
                return { status: 'NOT_FOUND', data: { message: this.PALLET_NOT_FOUND } };
            }
            const updatedPallet = await this.palletModel.findByPk(id);
            return { status: 'SUCCESSFUL', data: updatedPallet };
        }
        catch (error) {
            return { status: 'INTERNAL_ERROR', data: { message: this.ERROR_UPDATING_PALLET } };
        }
    }
    async remove(id) {
        try {
            const deletedRows = await this.palletModel.destroy({ where: { id } });
            if (deletedRows === 0) {
                return { status: 'NOT_FOUND', data: { message: this.PALLET_NOT_FOUND } };
            }
            return { status: 'SUCCESSFUL', data: true };
        }
        catch (error) {
            return { status: 'INTERNAL_ERROR', data: { message: this.ERROR_DELETING_PALLET } };
        }
    }
}
exports.PalletService = PalletService;
//# sourceMappingURL=PalletService.js.map