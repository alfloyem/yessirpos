export interface MenuItem {
    titleKey: string;
    icon: string;
    children: {
        titleKey: string;
        to: string;
    }[];
}

export const menuItems: MenuItem[] = [
    {
        titleKey: "menu.main_category",
        icon: "heroicons:chart-bar",
        children: [
            { titleKey: "menu.home", to: "/dashboard" },
            { titleKey: "menu.employees", to: "/employees" },
        ],
    },
    {
        titleKey: "menu.sales_category",
        icon: "lucide:shopping-bag",
        children: [
            { titleKey: "menu.sales", to: "/sales" },
            { titleKey: "menu.orders", to: "/archive" },
            { titleKey: "menu.webOrders", to: "/web-orders" },
            { titleKey: "menu.refund", to: "/refund" },
        ],
    },
    {
        titleKey: "menu.customers_category",
        icon: "lucide:users",
        children: [
            { titleKey: "menu.customers", to: "/customers" },
            { titleKey: "menu.giftCard", to: "/gift-cards" },
        ],
    },
    {
        titleKey: "menu.inventory_category",
        icon: "lucide:package",
        children: [
            { titleKey: "menu.products", to: "/products" },
            { titleKey: "menu.attributes", to: "/attributes" },
            { titleKey: "menu.suppliers", to: "/suppliers" },
            { titleKey: "menu.intake", to: "/received" },
        ],
    },
    {
        titleKey: "menu.finance_category",
        icon: "lucide:pie-chart",
        children: [
            { titleKey: "menu.reports", to: "/reports" },
            { titleKey: "menu.expenses", to: "/expenses" },
        ],
    },
];
