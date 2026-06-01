# NMPOIPGP_Lazar

Advanced Methods for Collection, Processing, and Display of Geographic Data

## About

NMPOIPGP_Lazar is a web application developed for the university course "Napredne metode prikupljanja, obrade i prikaza geografskih podataka" (Advanced Methods for Collection, Processing, and Display of Geographic Data). 

The application leverages Google Earth Engine to provide powerful geographic data analysis and visualization capabilities through an intuitive web interface, specifically focused on monitoring land-use and land-cover changes in Sombor, Serbia.

## Features

- 🌍 Interactive geographic data visualization for Sombor, Serbia
- 🛰️ Satellite imagery analysis using Dynamic World (10m resolution, 2015-present)
- 📊 Year-to-year land-use comparison with detailed statistics
- 📈 Area calculations by land-cover class (water, forests, crops, urban areas, etc.)
- 🎨 Change detection layers (built area expansion, crop loss)
- 🔍 Point inspector for class probability analysis over time
- 📍 Support for ESA WorldCover reference layer

## Live Application

**Visit the application here:** https://ee-lazar33t.projects.earthengine.app/view/analiza-promena-nkz-za-grad-sombor

No installation or special setup required! Simply click the link and start exploring.

## Getting Started

### For Users

Simply visit the live application link above to:
1. Compare land-use patterns between different years (2016-2025)
2. View area statistics for each land-cover class
3. Visualize urban expansion and agricultural changes
4. Inspect class probabilities at specific locations
5. Export analysis results

### For Developers

If you want to contribute or run the application locally:

1. **Clone the repository:**
   ```bash
   git clone https://github.com/lazar3vic/NMPOIPGP_Lazar.git
   cd NMPOIPGP_Lazar
   ```

2. **Access the code in Google Earth Engine:**
   - Open [Google Earth Engine Code Editor](https://code.earthengine.google.com/)
   - Create a new script
   - Copy the contents of `src/app.js` into the editor
   - Update the ROI (Region of Interest) path to your assets

3. **Run locally:**
   - Click "Run" to execute the script
   - The map and interface will appear in the right panel

## Technology Stack

- **Frontend:** Google Earth Engine Apps (UI components, interactive maps)
- **Backend:** Google Earth Engine API
- **Datasets:** 
  - Dynamic World V1 (land-use classification, 10m resolution)
  - ESA WorldCover 2021 (reference layer)
- **Hosting:** Google Earth Engine Apps platform

## Project Structure

```
NMPOIPGP_Lazar/
├── src/
│   └── app.js              # Main GEE application code
├── README.md               # This file
├── .gitignore              # Git configuration
├── LICENSE                 # MIT License
└── CONTRIBUTING.md         # Contribution guidelines
```

## Application Overview

### Key Capabilities

**1. Annual Composites**
- Creates modal composites of Dynamic World classifications for April-October of each year
- Allows comparison between any two years from 2016-2025

**2. Area Statistics**
- Calculates area per land-cover class in hectares
- Supports 9 land-cover classes: water, trees, grass, flooded vegetation, crops, shrub/scrub, built-up, bare ground, snow/ice

**3. Change Detection**
- Visualizes built-area expansion (urban development)
- Shows agricultural land loss
- Displays net change in area for each class

**4. Point Inspector**
- Click on any location to see class probability time series
- Monitors how classifications change over time at specific points

## Datasets Used

- **Dynamic World V1**: Google's machine learning-based global land-use classification (10m resolution)
- **ESA WorldCover 2021**: Reference layer for validation and comparison
- **Sombor Boundary**: Custom asset defining the study area

## Study Area

- **Location:** Sombor, Vojvodina, Serbia
- **Coordinates:** 19.107°E, 45.7715°N
- **Time Period:** 2016-2025
- **Seasonal Focus:** April-October (vegetation growing season)

## Requirements

- No GEE account required for users
- Modern web browser (Chrome, Firefox, Safari, Edge)
- Internet connection
- (For developers) Google Earth Engine account with API access

## How It Works

1. **Data Processing:**
   - Dynamic World images are filtered for the study region and date range
   - Modal (most common) class is selected for each pixel
   - Annual composites are generated for comparison

2. **Analysis:**
   - Pixel area calculations determine land-cover extent
   - Change detection identifies transitions between classes
   - Statistics are computed and visualized in charts

3. **Visualization:**
   - Interactive map displays classifications with color-coded legend
   - Multiple layers can be toggled on/off
   - Charts show area statistics and changes

## Contributing

Contributions are welcome! If you'd like to contribute:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/your-feature-name`)
3. Commit your changes (`git commit -m 'Add some improvement'`)
4. Push to the branch (`git push origin feature/your-feature-name`)
5. Open a Pull Request

See [CONTRIBUTING.md](CONTRIBUTING.md) for more details.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Author

**Lazar Trivić** - [GitHub Profile](https://github.com/lazar3vic)

## Contact & Support

For questions, bug reports, or suggestions:
- Open an issue on this repository
- Contact the author via GitHub

## Acknowledgments

- University course instructors and colleagues
- Google Earth Engine team and documentation
- Dynamic World creators (Google, World Resources Institute)
- ESA for WorldCover dataset
- Sombor city planning and GIS community

## Citation

If you use this application or code in your work, please cite:

```
Trivić, L. (2026). NMPOIPGP_Lazar: Land Use Monitoring for Sombor, Serbia. 
Available at: https://github.com/lazar3vic/NMPOIPGP_Lazar
```

---

*Last updated: June 2026*  
*Application: https://ee-lazar33t.projects.earthengine.app/view/analiza-promena-nkz-za-grad-sombor*
