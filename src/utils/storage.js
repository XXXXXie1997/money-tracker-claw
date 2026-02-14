import localforage from 'localforage'

// 配置 localForage
localforage.config({
  name: 'MoneyTracker',
  storeName: 'money_tracker_db',
  description: '记账应用数据存储'
})

// 创建不同的存储实例用于不同类型的数据
export const recordsStore = localforage.createInstance({
  name: 'MoneyTracker',
  storeName: 'records'
})

export const tagsStore = localforage.createInstance({
  name: 'MoneyTracker',
  storeName: 'tags'
})

export const settingsStore = localforage.createInstance({
  name: 'MoneyTracker',
  storeName: 'settings'
})

// 统一的存储接口
export const storage = {
  /**
   * 存储数据
   * @param {string} key 
   * @param {any} value 
   */
  async setItem(key, value) {
    return await localforage.setItem(key, value)
  },

  /**
   * 获取数据
   * @param {string} key 
   * @returns {Promise<any>}
   */
  async getItem(key) {
    return await localforage.getItem(key)
  },

  /**
   * 删除数据
   * @param {string} key 
   */
  async removeItem(key) {
    return await localforage.removeItem(key)
  },

  /**
   * 清空所有数据
   */
  async clear() {
    return await localforage.clear()
  },

  /**
   * 获取所有键
   * @returns {Promise<string[]>}
   */
  async keys() {
    return await localforage.keys()
  },

  /**
   * 获取数据条数
   * @returns {Promise<number>}
   */
  async length() {
    return await localforage.length()
  }
}

export default storage
