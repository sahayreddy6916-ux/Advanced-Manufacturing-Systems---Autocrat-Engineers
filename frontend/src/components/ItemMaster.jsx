import React, { useState } from 'react';

const ItemMaster = () => {
    const [currentView, setCurrentView] = useState('table'); // 'table' or 'form'

    // Mock data for the view table
    const [items, setItems] = useState([
        {
            itemCode: 'ITM-1001',
            description: 'Bearing Assembly',
            foreignName: 'Conjunto de rodamientos',
            itemType: 'Component',
            itemGroup: 'Mechanical'
        }
    ]);

    const [formData, setFormData] = useState({
        itemCode: '',
        description: '',
        foreignName: '',
        itemType: '',
        itemGroup: '',
        isInventoryItem: false,
        isPurchaseItem: false,
        isSalesItem: false,
        uom: '',
        materialConsider: '',
        materialGrade: '',
        itemSpecification: '',
        revision: '',
        size: ''
    });

    const handleInputChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData((prev) => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        // Add new item to the table (in a real app, this would be an API call)
        setItems((prev) => [...prev, formData]);
        setCurrentView('table');
        // Reset form
        setFormData({
            itemCode: '', description: '', foreignName: '', itemType: '', itemGroup: '',
            isInventoryItem: false, isPurchaseItem: false, isSalesItem: false,
            uom: '', materialConsider: '', materialGrade: '', itemSpecification: '', revision: '', size: ''
        });
    };

    if (currentView === 'form') {
        return (
            <div className="item-master-form-container p-6 bg-white rounded shadow-sm">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-bold text-gray-800">Create New Item</h2>
                    <button
                        onClick={() => setCurrentView('table')}
                        className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
                    >
                        Back to List
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-8">
                    {/* Basic Info Section */}
                    <section>
                        <h3 className="text-lg font-semibold mb-4 border-b pb-2">Basic Information</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium mb-1">Item Code</label>
                                <input type="text" name="itemCode" value={formData.itemCode} onChange={handleInputChange} className="w-full border rounded p-2" required />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Description</label>
                                <input type="text" name="description" value={formData.description} onChange={handleInputChange} className="w-full border rounded p-2" required />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Foreign Name</label>
                                <input type="text" name="foreignName" value={formData.foreignName} onChange={handleInputChange} className="w-full border rounded p-2" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Item Type</label>
                                <input type="text" name="itemType" value={formData.itemType} onChange={handleInputChange} className="w-full border rounded p-2" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Item Group</label>
                                <input type="text" name="itemGroup" value={formData.itemGroup} onChange={handleInputChange} className="w-full border rounded p-2" />
                            </div>
                        </div>
                    </section>

                    {/* Configuration Checkboxes */}
                    <section>
                        <h3 className="text-lg font-semibold mb-4 border-b pb-2">Item Configuration</h3>
                        <div className="flex space-x-6">
                            <label className="flex items-center space-x-2">
                                <input type="checkbox" name="isInventoryItem" checked={formData.isInventoryItem} onChange={handleInputChange} />
                                <span>Inventory Item</span>
                            </label>
                            <label className="flex items-center space-x-2">
                                <input type="checkbox" name="isPurchaseItem" checked={formData.isPurchaseItem} onChange={handleInputChange} />
                                <span>Purchase Item</span>
                            </label>
                            <label className="flex items-center space-x-2">
                                <input type="checkbox" name="isSalesItem" checked={formData.isSalesItem} onChange={handleInputChange} />
                                <span>Sales Item</span>
                            </label>
                        </div>
                    </section>

                    {/* User Fields Section */}
                    <section>
                        <h3 className="text-lg font-semibold mb-4 border-b pb-2">User Fields</h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                                <label className="block text-sm font-medium mb-1">UOM</label>
                                <input type="text" name="uom" value={formData.uom} onChange={handleInputChange} className="w-full border rounded p-2" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Material Consider</label>
                                <input type="text" name="materialConsider" value={formData.materialConsider} onChange={handleInputChange} className="w-full border rounded p-2" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Material Grade</label>
                                <input type="text" name="materialGrade" value={formData.materialGrade} onChange={handleInputChange} className="w-full border rounded p-2" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Item Specification</label>
                                <input type="text" name="itemSpecification" value={formData.itemSpecification} onChange={handleInputChange} className="w-full border rounded p-2" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Revision</label>
                                <input type="text" name="revision" value={formData.revision} onChange={handleInputChange} className="w-full border rounded p-2" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Size</label>
                                <input type="text" name="size" value={formData.size} onChange={handleInputChange} className="w-full border rounded p-2" />
                            </div>
                        </div>
                    </section>

                    <div className="flex justify-end space-x-4 mt-6">
                        <button
                            type="button"
                            onClick={() => setCurrentView('table')}
                            className="px-6 py-2 border border-gray-300 rounded text-gray-700 hover:bg-gray-50"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                        >
                            Save Item
                        </button>
                    </div>
                </form>
            </div>
        );
    }

    return (
        <div className="item-master-table-container p-6">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-800">Item Master</h2>
                <button
                    onClick={() => setCurrentView('form')}
                    className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 shadow-sm"
                >
                    + Add New Item
                </button>
            </div>

            <div className="overflow-x-auto bg-white rounded shadow-sm">
                <table className="min-w-full border-collapse">
                    <thead className="bg-gray-50 border-b">
                        <tr>
                            <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Item Code</th>
                            <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Description</th>
                            <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Foreign Name</th>
                            <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Item Type</th>
                            <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Item Group</th>
                        </tr>
                    </thead>
                    <tbody>
                        {items.map((item, index) => (
                            <tr key={index} className="border-b hover:bg-gray-50">
                                <td className="py-3 px-4 text-sm text-gray-800">{item.itemCode}</td>
                                <td className="py-3 px-4 text-sm text-gray-800">{item.description}</td>
                                <td className="py-3 px-4 text-sm text-gray-800">{item.foreignName}</td>
                                <td className="py-3 px-4 text-sm text-gray-800">{item.itemType}</td>
                                <td className="py-3 px-4 text-sm text-gray-800">{item.itemGroup}</td>
                            </tr>
                        ))}
                        {items.length === 0 && (
                            <tr>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default ItemMaster;