-- Restore dep_categories table with standard insurance depreciation categories
-- Run this script to restore the accidentally deleted dep_categories table

-- Drop and recreate the table
DROP TABLE IF EXISTS dep_categories;

CREATE TABLE dep_categories (
  id INT AUTO_INCREMENT PRIMARY KEY,
  code VARCHAR(8),
  name VARCHAR(128) UNIQUE NOT NULL,
  annual_depreciation_rate DECIMAL(6,4) NOT NULL,
  useful_life VARCHAR(16),
  examples_text TEXT
);

-- Insert standard depreciation categories with examples
INSERT INTO dep_categories (code, name, annual_depreciation_rate, useful_life, examples_text) VALUES
('KCW', 'KCW - KITCHEN (STORAGE)', 0.1000, '10 years', 'Kitchen items, storage containers, cookware, utensils, small appliances, dishes, glassware, silverware, kitchen tools, food processors, blenders, toasters, coffee makers, mixers, can openers, cutting boards, measuring cups, mixing bowls, pots, pans, bakeware, storage bins, pantry organizers'),
('ELC', 'ELC - ELECTRONICS B', 0.2000, '5 years', 'Electronics, TVs, computers, laptops, tablets, phones, audio equipment, speakers, headphones, gaming consoles, cameras, video equipment, home theater systems, smart devices, routers, modems, printers, scanners, monitors, keyboards, mice, cables, chargers'),
('LIN', 'LIN - BEDDING II', 0.0500, '20 years', 'Beds, mattresses, bedding, sheets, pillowcases, comforters, duvets, blankets, pillows, mattress pads, bed skirts, bed frames, headboards, footboards, nightstands, dressers, bedroom furniture, bedroom accessories, bed linens, mattress protectors'),
('SPG', 'SPG - SPORTING GOODS', 0.1000, '10 years', 'Sports equipment, outdoor gear, fitness items, exercise equipment, bicycles, golf clubs, tennis rackets, baseball equipment, football equipment, basketball equipment, soccer equipment, camping gear, hiking equipment, fishing gear, hunting equipment, workout clothes, athletic shoes, sports bags, gym equipment'),
('FRN', 'FRN - FURNITURE', 0.1000, '10 years', 'Furniture, tables, chairs, sofas, couches, loveseats, recliners, ottomans, coffee tables, end tables, dining tables, dining chairs, bar stools, bookcases, entertainment centers, TV stands, desks, office chairs, filing cabinets, wardrobes, armoires, dressers, nightstands, lamps, mirrors, wall art, home decor, rugs, curtains, throw pillows'),
('APM', 'APM - APPLIANCES (MAJOR)', 0.0500, '20 years', 'Major appliances, refrigerators, freezers, washers, dryers, dishwashers, ranges, ovens, stoves, microwaves, garbage disposals, trash compactors, water heaters, air conditioners, furnaces, heat pumps, dehumidifiers, humidifiers, air purifiers, water softeners, sump pumps'),
('LGP', 'LGP - OUTDOOR/PATIO', 0.2000, '5 years', 'Outdoor furniture, patio items, garden equipment, lawn mowers, leaf blowers, hedge trimmers, garden tools, shovels, rakes, hoes, wheelbarrows, garden hoses, sprinklers, outdoor lighting, patio umbrellas, outdoor cushions, grills, smokers, fire pits, outdoor heaters, pool equipment, deck furniture, outdoor rugs'),
('PER', 'PER - FOOD', 0.0000, '1 year', 'Food, beverages, consumables, groceries, canned goods, dry goods, spices, condiments, snacks, drinks, alcohol, wine, beer, liquor, perishable items, frozen foods, fresh produce, meat, dairy, bakery items, pantry staples'),
('TLS', 'TLS - TOOLS & HARDWARE', 0.1500, '7 years', 'Tools, hardware, construction materials, hand tools, power tools, drills, saws, hammers, screwdrivers, wrenches, pliers, measuring tools, levels, squares, tape measures, ladders, scaffolding, safety equipment, work gloves, safety glasses, hard hats, tool boxes, tool belts, fasteners, nails, screws, bolts, nuts, washers, anchors, brackets, hinges, locks, doorknobs'),
('CLT', 'CLT - CLOTHING & ACCESSORIES', 0.2500, '4 years', 'Clothing, shoes, accessories, jewelry, watches, handbags, wallets, belts, scarves, hats, gloves, socks, underwear, formal wear, casual wear, work clothes, uniforms, costumes, athletic wear, swimwear, outerwear, coats, jackets, sweaters, shirts, pants, dresses, skirts, suits, ties, cufflinks, earrings, necklaces, bracelets, rings'),
('ARC', 'ARC - ART', 0.0500, '20 years', 'Paintings, drawings, prints, photographs, sculptures, artwork, collectibles, antiques, decorative art, wall hangings, framed art, canvas art, metal art, wood art, ceramic art, glass art, pottery, vases, figurines, decorative objects, art supplies, easels, frames, matting, art storage, wall decor, posters, prints, watercolor'),
('OFS', 'OFS - OFFICE SUPPLIES', 0.1000, '10 years', 'Office supplies, stationery, paper, pens, pencils, markers, highlighters, notebooks, binders, folders, staplers, paper clips, rubber bands, tape, glue, scissors, rulers, calculators, desk organizers, file cabinets, office furniture, desk accessories'),
('PCB', 'PCB - MISC', 0.1000, '10 years', 'Miscellaneous items, general merchandise, platform trucks, carts, dollies, hand trucks, utility carts, storage containers, bins, boxes, general purpose items, miscellaneous equipment'),
('HSW', 'HSW - FRAMES & ALBUMS', 0.0500, '20 years', 'Photo frames, picture frames, albums, scrapbooks, photo storage, memory books, frame collections, decorative frames, wall frames, table frames, digital photo frames, photo displays');

-- Add indexes for better performance
CREATE INDEX idx_dep_categories_name ON dep_categories(name);
CREATE INDEX idx_dep_categories_rate ON dep_categories(annual_depreciation_rate);

-- Verify the data
SELECT COUNT(*) as total_categories FROM dep_categories;
SELECT name, annual_depreciation_rate, useful_life FROM dep_categories ORDER BY name;
