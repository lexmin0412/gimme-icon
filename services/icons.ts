/**
 * 动态获取指定图标库的所有图标
 */
export const loadIcons = async (libNames: string[]) => {
  // 确保 libNames 是数组
  const libraries = Array.isArray(libNames) ? libNames : [libNames];
  
  // 并行加载所有图标库
  const iconArrays = await Promise.all(
    libraries.map(async (libName) => {
      const icons = await import(`@iconify/json/json/${libName}.json`);
      return Object.keys(icons.icons).map((key) => {
        const icon = icons.icons[key];
        return {
          id: `${libName}__${key}`,
          name: key,
          description: `a ${key} icon in ${libName}`,
          svg: `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">${icon.body}</svg>`,
          library: libName,
          category: "",
          tags: key.includes("-") ? key.split("-") : [key],
          synonyms: [],
        };
      });
    })
  );
  
  // 合并所有图标数组
  return iconArrays.flat();
};
